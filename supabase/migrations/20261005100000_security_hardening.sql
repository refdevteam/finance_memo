-- ============================================================
-- 20261005100000_security_hardening.sql
-- Audit keamanan 05-10-2026 — penguatan database.
--
-- Prinsip: setiap blok IDEMPOTEN dan aman dijalankan baik ketika
-- perbaikan serupa sudah pernah diterapkan langsung di production
-- (lihat proggress/supabase-optimizer) maupun belum.
--
-- Setelah migration ini, JALANKAN skrip verifikasi di bagian bawah
-- SECURITY_AUDIT.md untuk memastikan privilege benar-benar berubah.
-- ============================================================


-- ============================================================
-- 0. Kuota scan struk — penghitung PERCOBAAN (biaya LLM)
--
-- Kuota sebelumnya dihitung dari baris `receipts` yang hanya tercipta
-- setelah Gemini sukses, sehingga percobaan yang ditolak model tidak
-- pernah terhitung dan kuota 20/hari bisa dilewati. Mengikuti pola yang
-- sudah ada di tabel ini (wallet_edit_count / wallet_edit_date).
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS scan_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scan_date   DATE;

-- RPC atomik: ambil tepat SATU kuota dalam satu UPDATE ber-KLAUSA WHERE.
-- Beberapa request yang berjalan bersamaan tidak akan bisa sama-sama lolos
-- (menutup celah TOCTOU pada pemeriksaan baca-lalu-tulis).
-- Mengikat ke auth.uid() di dalam fungsi, jadi tidak bisa dipakai untuk
-- menguras kuota orang lain.
CREATE OR REPLACE FUNCTION public.consume_scan_quota(p_limit INT DEFAULT 20)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'UTC')::date;
  v_used  INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.profiles
     SET scan_count = CASE WHEN scan_date = v_today THEN scan_count + 1 ELSE 1 END,
         scan_date   = v_today
   WHERE id = auth.uid()
     AND (scan_date IS DISTINCT FROM v_today OR scan_count < p_limit)
  RETURNING scan_count INTO v_used;

  RETURN v_used IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_scan_quota(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_scan_quota(INT) TO authenticated;


-- ------------------------------------------------------------
-- 1. NOTIFICATIONS — tutup kebijakan INSERT yang terbuka lebar
--
-- Sebelumnya:
--   CREATE POLICY "notifications: service insert"
--     ON notifications FOR INSERT WITH CHECK (TRUE);
-- Tanpa klausa `TO <role>`, kebijakan ini berlaku untuk SEMUA peran
-- (termasuk `authenticated`). Akibatnya setiap pengguna login bisa
-- menyisipkan notifikasi ke akun mana pun (vektor phishing/spam
-- in-app), langsung lewat PostgREST tanpa melalui aplikasi.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "notifications: service insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications: insert own"      ON public.notifications;
DROP POLICY IF EXISTS "notifications: insert related"  ON public.notifications;
DROP POLICY IF EXISTS "notifications: delete own"      ON public.notifications;

-- (a) Pengguna biasa: hanya boleh menulis notifikasi miliknya sendiri.
CREATE POLICY "notifications: insert own"
  ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- (b) Pengguna biasa boleh menulis ke partner, HANYA bila ada relasi
--     nyata. Cakup ketiga alur notifikasi yang sah di aplikasi:
--       • ajukan patungan   (payer  -> partner)
--       • tandai lunas      (partner-> payer)
--       • batalkan patungan (payer  -> partner) — baris split_bills sudah
--         ter-cascade saat notifikasi dikirim, jadi sandarannya adalah
--         last_bill_partners yang ikut bertahan.
--     Tidak ada relasi = ditolak.
CREATE POLICY "notifications: insert related"
  ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id IS NOT NULL
    AND user_id <> (SELECT auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM public.last_bill_partners l
        WHERE l.user_id = (SELECT auth.uid()) AND l.partner_user_id = user_id
      )
      OR EXISTS (
        SELECT 1 FROM public.last_bill_partners l
        WHERE l.user_id = user_id AND l.partner_user_id = (SELECT auth.uid())
      )
      OR EXISTS (
        SELECT 1
        FROM public.split_bills b
        JOIN public.split_bill_shares s ON s.split_bill_id = b.id
        WHERE b.user_id = (SELECT auth.uid()) AND s.partner_user_id = user_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.split_bills b
        JOIN public.split_bill_shares s ON s.split_bill_id = b.id
        WHERE b.user_id = user_id AND s.partner_user_id = (SELECT auth.uid())
      )
    )
  );

-- (c) Kebijakan lama, kini dibatasi hanya untuk peran service_role
--     (dipakai Edge Function & trigger berbasis pg_net).
CREATE POLICY "notifications: service insert"
  ON public.notifications
  FOR INSERT TO service_role
  WITH CHECK (TRUE);

-- (d) Sebelumnya tidak ada kebijakan DELETE sama sekali, sehingga
--     deleteNotification() di aplikasi selalu no-op.
CREATE POLICY "notifications: delete own"
  ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));


-- ------------------------------------------------------------
-- 2. RPC INTERNAL — cegah pemanggilan langsung via PostgREST
--
-- Fungsi-fungsi ini SECURITY DEFINER dan dipanggil hanya oleh Edge
-- Function memakai service role. Tanpa REVOKE, peran `anon` (kunci
-- publik NEXT_PUBLIC_SUPABASE_ANON_KEY) bisa memanggilnya langsung
-- dari /rest/v1/rpc/ dan melewati seluruh autentikasi yang baru saja
-- dipasang di lapisan Edge Function:
--   • check_budget_alerts()            -> spam notifikasi massal
--   • process_due_recurring_templates() -> membuat transaksi berulang
--                                         berulang kali (korupsi data)
--   • process_due_reminders()           -> email bombing + boros kuota
--                                         Resend/FCM
--
-- Blok dinamis dipakai agar tanda tangan argumen tidak perlu
-- diketahui di muka (dan menangani overload/riwayat prod yang beda).
-- ------------------------------------------------------------
DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'check_budget_alerts',
        'process_due_recurring_templates',
        'process_due_reminders',
        'update_wallet_balance',
        'handle_new_user',
        'touch_updated_at',
        -- Fungsi drift (hanya ada di production) berupa trigger.
        -- Privilege EXECUTE tidak dicek saat trigger ditembakkan, jadi
        -- pencabutan ini aman dan hanya menutup pemanggilan via RPC.
        'update_user_streak'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',
                   fn.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',
                   fn.signature);
  END LOOP;
END $$;


-- ------------------------------------------------------------
-- 2b. GRANT tabel berlebih untuk peran `anon`
--
-- Hasil verifikasi production 09-10-2026: `categories` adalah SATU-SATUNYA
-- tabel yang masih punya GRANT SELECT untuk `anon`. Kebijakan RLS-nya
-- memang membatasi anon pada baris default (user_id IS NULL), tetapi
-- tidak ada satu pun alur aplikasi yang membutuhkannya — seluruh
-- pembacaan kategori terjadi di halaman dashboard yang sudah login
-- (peran `authenticated`, lihat src/app/dashboard/layout.tsx dan
-- src/components/transactions/*). Mencabutnya menutup akses baca tanpa
-- autentikasi tanpa menyentuh alur yang ada.
-- ------------------------------------------------------------
REVOKE SELECT ON public.categories FROM anon;


-- ------------------------------------------------------------
-- 3. execute_wallet_transfer — validasi pemilik di dalam fungsi
--
-- Audit 05-10-2026 memastikan REVOKE sudah aktif untuk `anon`
-- (respons: "permission denied for function execute_wallet_transfer").
-- Pemeriksaan internal ini adalah lapisan kedua: kalau suatu saat
-- hak EXECUTE kembali dibuka, fungsi tetap menolak pemanggil yang
-- bukan pemilik `p_user_id`.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.execute_wallet_transfer(
  p_user_id UUID,
  p_from_wallet_id UUID,
  p_to_wallet_id UUID,
  p_amount NUMERIC,
  p_notes TEXT,
  p_transfer_date DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_from_trx_id UUID;
  v_to_trx_id UUID;
  v_transfer_id UUID;
  v_caller UUID := auth.uid();
BEGIN
  -- Ikat ke identitas pemanggil. auth.uid() NULL untuk peran service_role
  -- (pemanggil server), jadi hanya ditolak bila memang ada pemanggil
  -- ber- JWT yang mengaku sebagai user lain.
  IF v_caller IS NOT NULL AND v_caller <> p_user_id THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Kamu hanya bisa mentransfer dari dompet milikmu sendiri.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.wallets
                 WHERE id = p_from_wallet_id AND user_id = p_user_id AND is_active = TRUE) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet asal tidak valid atau tidak aktif.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.wallets
                 WHERE id = p_to_wallet_id AND user_id = p_user_id AND is_active = TRUE) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet tujuan tidak valid atau tidak aktif.');
  END IF;

  IF p_from_wallet_id = p_to_wallet_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet asal dan tujuan tidak boleh sama.');
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Jumlah transfer harus lebih dari 0.');
  END IF;

  INSERT INTO public.transactions (user_id, wallet_id, amount, type, description, notes, transaction_date)
  VALUES (p_user_id, p_from_wallet_id, p_amount, 'transfer', 'Transfer Keluar', p_notes, p_transfer_date)
  RETURNING id INTO v_from_trx_id;

  INSERT INTO public.transactions (user_id, wallet_id, amount, type, description, notes, transaction_date)
  VALUES (p_user_id, p_to_wallet_id, p_amount, 'transfer', 'Transfer Masuk', p_notes, p_transfer_date)
  RETURNING id INTO v_to_trx_id;

  -- 'transfer' diabaikan oleh trg_wallet_balance, jadi saldo dihitung manual.
  -- Klausa user_id = p_user_id menjamin hanya dompet pemanggil yang disentuh.
  UPDATE public.wallets SET balance = balance - p_amount, updated_at = NOW()
  WHERE id = p_from_wallet_id AND user_id = p_user_id;
  UPDATE public.wallets SET balance = balance + p_amount, updated_at = NOW()
  WHERE id = p_to_wallet_id AND user_id = p_user_id;

  INSERT INTO public.wallet_transfers
    (user_id, from_wallet_id, to_wallet_id, amount, from_trx_id, to_trx_id, notes, transfer_date)
  VALUES (p_user_id, p_from_wallet_id, p_to_wallet_id, p_amount, v_from_trx_id, v_to_trx_id, p_notes, p_transfer_date)
  RETURNING id INTO v_transfer_id;

  RETURN jsonb_build_object('success', true, 'transfer_id', v_transfer_id);
EXCEPTION
  WHEN OTHERS THEN
    -- Jangan bocorkan SQLERRM (teks error Postgres mentah) ke klien.
    RAISE WARNING 'execute_wallet_transfer failed: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', 'Transfer gagal diproses.');
END;
$$;

REVOKE ALL ON FUNCTION public.execute_wallet_transfer(UUID, UUID, UUID, NUMERIC, TEXT, DATE)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_wallet_transfer(UUID, UUID, UUID, NUMERIC, TEXT, DATE)
  TO authenticated, service_role;


-- ------------------------------------------------------------
-- 4. update_wallet_balance — JANGAN sentuh dompet milik orang lain
--
-- Trigger ini SECURITY DEFINER (melewati RLS) dan semula melakukan
--   UPDATE wallets ... WHERE id = NEW.wallet_id
-- tanpa memeriksa pemilik. Server action menerima `wallet_id` dari
-- klien (addTransaction, createSplitBill, createRecurringTemplate,
-- dst.) tanpa memverifikasinya, sehingga siapa pun yang mengetahui
-- UUID dompet korban bisa mengubah saldo korban.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.type = 'income' THEN
      UPDATE public.wallets SET balance = balance + NEW.amount, updated_at = NOW()
      WHERE id = NEW.wallet_id AND user_id = NEW.user_id;
    ELSIF NEW.type = 'expense' THEN
      UPDATE public.wallets SET balance = balance - NEW.amount, updated_at = NOW()
      WHERE id = NEW.wallet_id AND user_id = NEW.user_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.type = 'income' THEN
      UPDATE public.wallets SET balance = balance - OLD.amount, updated_at = NOW()
      WHERE id = OLD.wallet_id AND user_id = OLD.user_id;
    ELSIF OLD.type = 'expense' THEN
      UPDATE public.wallets SET balance = balance + OLD.amount, updated_at = NOW()
      WHERE id = OLD.wallet_id AND user_id = OLD.user_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.type = 'income' THEN
      UPDATE public.wallets SET balance = balance - OLD.amount
      WHERE id = OLD.wallet_id AND user_id = OLD.user_id;
    ELSIF OLD.type = 'expense' THEN
      UPDATE public.wallets SET balance = balance + OLD.amount
      WHERE id = OLD.wallet_id AND user_id = OLD.user_id;
    END IF;
    IF NEW.type = 'income' THEN
      UPDATE public.wallets SET balance = balance + NEW.amount, updated_at = NOW()
      WHERE id = NEW.wallet_id AND user_id = NEW.user_id;
    ELSIF NEW.type = 'expense' THEN
      UPDATE public.wallets SET balance = balance - NEW.amount, updated_at = NOW()
      WHERE id = NEW.wallet_id AND user_id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


-- ------------------------------------------------------------
-- 5. Hardening SECURITY DEFINER lainnya (search_path statik)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auth_uid() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT auth.uid();
$$;

-- update_user_streak: fungsi drift (hanya di production), SECURITY DEFINER
-- tanpa search_path statik. Dibaca apa adanya dari hasil verifikasi:
-- memanggil public.profiles dari dalam trigger transaksi.
ALTER FUNCTION public.update_user_streak() SET search_path = public, pg_temp;

-- auth_uid() dipakai di dalam kebijakan RLS, jadi `authenticated`
-- tetap membutuhkannya. `anon` tidak punya GRANT tabel sama sekali,
-- jadi mencabutnya di sini aman.
REVOKE ALL ON FUNCTION public.auth_uid() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auth_uid() TO authenticated, service_role;


-- ------------------------------------------------------------
-- 6. monthly_summary — paksa evaluasi dengan hak pemanggil
--
-- View SECURITY DEFINER (bawaan) mengevaluasi hak berdasarkan
-- pemilik view, bukan pemanggil, sehingga bisa membocorkan ringkasan
-- pengeluaran lintas pengguna.
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'monthly_summary' AND c.relkind = 'v'
  ) THEN
    EXECUTE 'ALTER VIEW public.monthly_summary SET (security_invoker = true)';
  END IF;
END $$;


-- ------------------------------------------------------------
-- VERIFIKASI (jalankan terpisah setelah push)
-- ------------------------------------------------------------
-- 1) Kebijakan notifications tidak lagi terbuka:
--    SELECT polname, roles, cmd, qual, with_check
--    FROM pg_policies WHERE schemaname='public' AND tablename='notifications';
--    -> tidak boleh ada baris dengan qual = 'true' untuk peran selain service_role.
--
-- 2) Privilege RPC:
--    SELECT p.proname,
--           has_function_privilege('anon',          p.oid, 'EXECUTE') AS anon_exec,
--           has_function_privilege('authenticated',  p.oid, 'EXECUTE') AS auth_exec,
--           has_function_privilege('service_role',   p.oid, 'EXECUTE') AS svc_exec
--    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--    WHERE n.nspname='public'
--      AND p.proname IN ('check_budget_alerts','process_due_recurring_templates',
--                        'process_due_reminders','execute_wallet_transfer',
--                        'auth_uid','update_wallet_balance');
--    -> anon_exec & auth_exec harus FALSE kecuali execute_wallet_transfer
--       (auth_exec TRUE) dan auth_uid (auth_exec TRUE).
