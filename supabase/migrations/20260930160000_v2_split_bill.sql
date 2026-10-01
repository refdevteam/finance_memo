-- ============================================================
-- Fimo V2 - Split Bill (Patungan) + Last Bill Partners (QR)
-- ============================================================
-- 3 tabel baru:
--   last_bill_partners : daftar teman bayar (diisi via scan QR Fimo / manual)
--   split_bills        : tagihan patungan (1 transaksi expense penuh di transactions)
--   split_bill_shares  : bagian/piutang per teman
-- Saldo wallet TIDAK ditulis aplikasi — trigger trg_wallet_balance yang handle.
-- ============================================================

-- 1. Daftar teman bayar (pengganti akses kontak HP di web)
CREATE TABLE IF NOT EXISTS public.last_bill_partners (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  partner_user_id UUID,                                  -- dari QR Fimo (NULL = input manual)
  name            TEXT NOT NULL,
  avatar_url      TEXT,
  source          TEXT NOT NULL DEFAULT 'qr' CHECK (source IN ('qr', 'manual')),
  last_used_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dedupe: satu partner_user_id hanya sekali per user
CREATE UNIQUE INDEX IF NOT EXISTS uq_last_bill_partner_user
  ON public.last_bill_partners (user_id, partner_user_id)
  WHERE partner_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_last_bill_partners_user_used
  ON public.last_bill_partners (user_id, last_used_at DESC);

-- 2. Tagihan patungan (FK ke transaksi expense yang mewakili total tagihan)
CREATE TABLE IF NOT EXISTS public.split_bills (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  amount         NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  split_method   TEXT NOT NULL DEFAULT 'equal' CHECK (split_method IN ('equal', 'custom')),
  status         TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'settled')),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_split_bills_user_created
  ON public.split_bills (user_id, created_at DESC);

-- 3. Bagian per teman (piutang)
CREATE TABLE IF NOT EXISTS public.split_bill_shares (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_bill_id       UUID NOT NULL REFERENCES public.split_bills(id) ON DELETE CASCADE,
  partner_id          UUID REFERENCES public.last_bill_partners(id) ON DELETE SET NULL,
  partner_user_id     UUID,                              -- snapshot dari partner/QR
  name                TEXT NOT NULL,                     -- snapshot nama saat split dibuat
  avatar_url          TEXT,
  amount              NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_at             TIMESTAMPTZ,
  paid_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_split_shares_bill
  ON public.split_bill_shares (split_bill_id);
CREATE INDEX IF NOT EXISTS idx_split_shares_partner
  ON public.split_bill_shares (partner_id);

-- ============================================================
-- RLS (mengikuti gaya .agents/002_rls.sql — helper auth_uid() sudah ada)
-- ============================================================
ALTER TABLE public.last_bill_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_bills         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_bill_shares   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "last_bill_partners: all own" ON public.last_bill_partners;
CREATE POLICY "last_bill_partners: all own"
  ON public.last_bill_partners FOR ALL
  USING (user_id = auth_uid())
  WITH CHECK (user_id = auth_uid());

DROP POLICY IF EXISTS "split_bills: all own" ON public.split_bills;
CREATE POLICY "split_bills: all own"
  ON public.split_bills FOR ALL
  USING (user_id = auth_uid())
  WITH CHECK (user_id = auth_uid());

DROP POLICY IF EXISTS "split_bill_shares: all own" ON public.split_bill_shares;
CREATE POLICY "split_bill_shares: all own"
  ON public.split_bill_shares FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.split_bills sb
      WHERE sb.id = split_bill_shares.split_bill_id AND sb.user_id = auth_uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.split_bills sb
      WHERE sb.id = split_bill_shares.split_bill_id AND sb.user_id = auth_uid()
    )
  );

-- ============================================================
-- Auto-update updated_at (reuse fungsi touch_updated_at() dari 001_init)
-- ============================================================
DROP TRIGGER IF EXISTS trg_last_bill_partners_updated_at ON public.last_bill_partners;
CREATE TRIGGER trg_last_bill_partners_updated_at
  BEFORE UPDATE ON public.last_bill_partners
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_split_bills_updated_at ON public.split_bills;
CREATE TRIGGER trg_split_bills_updated_at
  BEFORE UPDATE ON public.split_bills
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
