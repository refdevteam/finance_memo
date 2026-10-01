-- ============================================================
-- Split Bill V1.1 — Share tagihan ke teman (read-only + notifikasi)
-- ============================================================
-- 1. Tipe notifikasi baru untuk ajangan/lunas/batal patungan.
--    Catatan PG15: ALTER TYPE ADD VALUE aman dalam transaksi ASALAMA
--    nilai baru tidak digunakan dalam transaksi yang sama (tidak ada INSERT di sini).
ALTER TYPE public.notif_type ADD VALUE IF NOT EXISTS 'split_bill';

-- 2. RPC read-only: daftar tagihan yang BERISI saya (dibuat orang lain).
--    SECURITY DEFINER agar bisa membaca split_bills/shares milik user lain
--    TANPA policy silang (policy silang split_bills <-> split_bill_shares
--    memicu error "infinite recursion detected in policy").
--    Filter ketat: hanya baris di mana partner_user_id = auth_uid(),
--    tidak mengembalikan kolom dompet/kategori/transaksi pembayar
--    (RLS transactions all-own tetap berlaku).
CREATE OR REPLACE FUNCTION public.bills_shared_with_me()
RETURNS TABLE (
  id               uuid,
  title            text,
  amount           numeric,
  split_method     text,
  status           text,
  notes            text,
  created_at       timestamptz,
  payer_id         uuid,
  payer_name       text,
  payer_avatar     text,
  my_share_amount  numeric,
  my_share_status  text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id,
    b.title,
    b.amount,
    b.split_method,
    b.status,
    b.notes,
    b.created_at,
    b.user_id,
    pr.full_name,
    pr.avatar_url,
    s.amount,
    s.status
  FROM public.split_bills b
  JOIN public.split_bill_shares s
    ON s.split_bill_id = b.id
   AND s.partner_user_id = auth_uid()
  JOIN public.profiles pr
    ON pr.id = b.user_id
  WHERE b.user_id <> auth_uid()
  ORDER BY b.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.bills_shared_with_me() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bills_shared_with_me() TO authenticated;
