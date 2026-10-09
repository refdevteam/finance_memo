-- ============================================================
-- 20261009120000_capture_drift_functions.sql
-- Menangkap dua fungsi yang HANYA ada di database production
-- (hasil probe 09-10-2026) ke dalam repositori, supaya keadaan
-- database dapat direproduksi dari file migrasi (temuan 5.2).
--
-- Definisi di bawah ini adalah SALINAN LANGSUNG dari
-- pg_get_functiondef() production, bukan penulisan ulang.
--
-- Catatan keamanan:
--   • process_due_reminders — SECURITY DEFINER dengan search_path
--     statik 'public'. Dipanggil hanya oleh Edge Function send-reminder
--     memakai service_role; sejak 20261005100000 hak EXECUTE untuk
--     anon/authenticated sudah dicabut.
--   • update_user_streak — fungsi TRIGGER (RETURNS trigger), jadi tidak
--     dapat dieksekusi bermakna lewat RPC. search_path statik ditambahkan
--     oleh migrasi 20261005100000.
-- ============================================================


-- ------------------------------------------------------------
-- 1. process_due_reminders()
--    Memproses pengingat jatuh tempo: membuat notifikasi in-app,
--    lalu menggeser due_date/next_remind sesuai frequency.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_due_reminders()
 RETURNS TABLE(reminder_id uuid, user_id uuid, title text, type text, amount numeric, due_date date, next_remind timestamp with time zone, channels jsonb, notes text, email text, fcm_token text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
  v_next_due DATE;
  v_next_remind TIMESTAMPTZ;
  v_body TEXT;
  v_formatted_amount TEXT;
BEGIN
  FOR rec IN 
    SELECT rem.id, rem.user_id, rem.title, rem.type::text as type, rem.amount, rem.due_date, rem.frequency, rem.next_remind, rem.channels, rem.notes, p.fcm_token, u.email
    FROM public.reminders rem
    JOIN public.profiles p ON rem.user_id = p.id
    JOIN auth.users u ON p.id = u.id
    WHERE rem.is_active = true 
      AND (rem.next_remind IS NULL OR rem.next_remind <= NOW())
  LOOP
    -- 1. Create in-app notification if channel inapp is true
    IF COALESCE((rec.channels->>'inapp')::boolean, true) THEN
      IF rec.amount IS NOT NULL AND rec.amount > 0 THEN
        v_formatted_amount := replace(to_char(rec.amount, 'FM999,999,999,999'), ',', '.');
        v_body := 'Pembayaran senilai Rp ' || v_formatted_amount || ' jatuh tempo.';
      ELSE
        v_body := COALESCE(rec.notes, 'Pengingat jatuh tempo hari ini.');
      END IF;
      
      INSERT INTO public.notifications (user_id, title, body, type, is_read, action_url, metadata)
      VALUES (
        rec.user_id,
        rec.title,
        v_body,
        'reminder',
        false,
        '/dashboard/reminders',
        jsonb_build_object('reminder_id', rec.id, 'type', rec.type)
      );
    END IF;

    -- 2. Calculate next remind and due date based on frequency
    IF rec.frequency IS NULL THEN
      UPDATE public.reminders
      SET is_active = false,
          next_remind = NULL
      WHERE id = rec.id;
      
      v_next_due := rec.due_date;
      v_next_remind := NULL;
    ELSE
      IF rec.frequency = 'daily' THEN
        v_next_due := rec.due_date + INTERVAL '1 day';
        v_next_remind := rec.next_remind + INTERVAL '1 day';
      ELSIF rec.frequency = 'weekly' THEN
        v_next_due := rec.due_date + INTERVAL '1 week';
        v_next_remind := rec.next_remind + INTERVAL '1 week';
      ELSIF rec.frequency = 'monthly' THEN
        v_next_due := rec.due_date + INTERVAL '1 month';
        v_next_remind := rec.next_remind + INTERVAL '1 month';
      ELSIF rec.frequency = 'yearly' THEN
        v_next_due := rec.due_date + INTERVAL '1 year';
        v_next_remind := rec.next_remind + INTERVAL '1 year';
      ELSE
        v_next_due := rec.due_date;
        v_next_remind := NULL;
      END IF;

      UPDATE public.reminders
      SET due_date = v_next_due,
          next_remind = v_next_remind
      WHERE id = rec.id;
    END IF;

    reminder_id := rec.id;
    user_id := rec.user_id;
    title := rec.title;
    type := rec.type;
    amount := rec.amount;
    due_date := rec.due_date;
    next_remind := rec.next_remind;
    channels := rec.channels;
    notes := rec.notes;
    email := rec.email;
    fcm_token := rec.fcm_token;
    
    RETURN NEXT;
  END LOOP;
END;
$function$;


-- ------------------------------------------------------------
-- 2. update_user_streak() — fungsi trigger pada transaksi
--    Menghitung streak pencatatan harian di tabel profiles.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_user_streak()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    last_date DATE;
    v_trx_date DATE;
    user_streak INTEGER;
BEGIN
    -- Get current transaction date
    v_trx_date := NEW.transaction_date;

    -- Fetch streak info from profile
    SELECT (last_recorded_at::date), record_streak
    INTO last_date, user_streak
    FROM public.profiles
    WHERE id = NEW.user_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Streak logic:
    -- 1. If first time or streak is 0, start at 1
    IF user_streak IS NULL OR user_streak = 0 OR last_date IS NULL THEN
        user_streak := 1;
    -- 2. If recorded on the same day, streak remains unchanged
    ELSIF v_trx_date = last_date THEN
        -- No streak update
    -- 3. If recorded exactly 1 day after, increment streak
    ELSIF v_trx_date = last_date + INTEGER '1' THEN
        user_streak := user_streak + 1;
    -- 4. If recorded after a gap (> 1 day), reset streak to 1
    ELSIF v_trx_date > last_date + INTEGER '1' THEN
        user_streak := 1;
    -- 5. If recorded in the past (< last_date), ignore streak update
    END IF;

    -- Update user profile
    UPDATE public.profiles
    SET record_streak = user_streak,
        last_recorded_at = NOW()
    WHERE id = NEW.user_id;

    RETURN NEW;
END;
$function$;
