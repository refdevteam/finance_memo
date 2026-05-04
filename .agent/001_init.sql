-- ============================================================
-- Fimo - Initial Schema Migration
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  avatar_url  TEXT,
  currency    TEXT NOT NULL DEFAULT 'IDR',
  timezone    TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  onboarded   BOOLEAN NOT NULL DEFAULT FALSE,
  fcm_token   TEXT, -- Firebase Cloud Messaging token for push notif
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TYPE category_type AS ENUM ('income', 'expense', 'transfer');

CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  icon        TEXT NOT NULL DEFAULT '💰',
  color       TEXT NOT NULL DEFAULT '#1D9E75',
  type        category_type NOT NULL DEFAULT 'expense',
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WALLETS (akun keuangan)
-- ============================================================
CREATE TYPE wallet_type AS ENUM ('cash', 'bank', 'ewallet', 'investment', 'other');

CREATE TABLE wallets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        wallet_type NOT NULL DEFAULT 'cash',
  balance     NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency    TEXT NOT NULL DEFAULT 'IDR',
  color       TEXT NOT NULL DEFAULT '#1D9E75',
  icon        TEXT NOT NULL DEFAULT '💳',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RECEIPTS (hasil scan struk)
-- ============================================================
CREATE TYPE receipt_type AS ENUM ('purchase', 'payment', 'payslip', 'transfer', 'topup', 'bill', 'other');

CREATE TABLE receipts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  image_url       TEXT NOT NULL,
  raw_text        TEXT,
  merchant_name   TEXT,
  total_amount    NUMERIC(15,2),
  receipt_date    DATE,
  receipt_type    receipt_type DEFAULT 'other',
  ai_extracted    JSONB DEFAULT '{}',  -- full AI extraction result
  is_processed    BOOLEAN NOT NULL DEFAULT FALSE,
  scanned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RECURRING TEMPLATES (cicilan, langganan berulang)
-- ============================================================
CREATE TYPE frequency_type AS ENUM ('daily', 'weekly', 'monthly', 'yearly');

CREATE TABLE recurring_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  wallet_id       UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  amount          NUMERIC(15,2) NOT NULL,
  type            category_type NOT NULL DEFAULT 'expense',
  frequency       frequency_type NOT NULL DEFAULT 'monthly',
  next_due_date   DATE NOT NULL,
  end_date        DATE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE TABLE transactions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  wallet_id         UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  category_id       UUID REFERENCES categories(id) ON DELETE SET NULL,
  receipt_id        UUID REFERENCES receipts(id) ON DELETE SET NULL,
  recurring_id      UUID REFERENCES recurring_templates(id) ON DELETE SET NULL,
  amount            NUMERIC(15,2) NOT NULL,
  type              category_type NOT NULL,
  description       TEXT,
  notes             TEXT,
  transaction_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring      BOOLEAN NOT NULL DEFAULT FALSE,
  tags              TEXT[] DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- For transfer between wallets
CREATE TABLE wallet_transfers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  from_wallet_id    UUID NOT NULL REFERENCES wallets(id),
  to_wallet_id      UUID NOT NULL REFERENCES wallets(id),
  amount            NUMERIC(15,2) NOT NULL,
  from_trx_id       UUID REFERENCES transactions(id),
  to_trx_id         UUID REFERENCES transactions(id),
  notes             TEXT,
  transfer_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BUDGETS (anggaran bulanan per kategori)
-- ============================================================
CREATE TABLE budgets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id   UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount        NUMERIC(15,2) NOT NULL,
  month         SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year          SMALLINT NOT NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, category_id, month, year)
);

-- ============================================================
-- REMINDERS
-- ============================================================
CREATE TYPE reminder_type AS ENUM ('saving', 'installment', 'subscription', 'bill', 'custom');

CREATE TABLE reminders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  type          reminder_type NOT NULL DEFAULT 'custom',
  amount        NUMERIC(15,2),
  due_date      DATE NOT NULL,
  frequency     frequency_type,
  next_remind   TIMESTAMPTZ,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  channels      JSONB NOT NULL DEFAULT '{"push": true, "email": false, "inapp": true}',
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS (in-app)
-- ============================================================
CREATE TYPE notif_type AS ENUM ('reminder', 'budget_alert', 'recurring', 'system', 'ai_insight');

CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  type          notif_type NOT NULL DEFAULT 'system',
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  action_url    TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- VIEWS: spending summary per bulan
-- ============================================================
CREATE VIEW monthly_summary AS
SELECT
  t.user_id,
  EXTRACT(YEAR FROM t.transaction_date)::INT  AS year,
  EXTRACT(MONTH FROM t.transaction_date)::INT AS month,
  t.type,
  SUM(t.amount) AS total
FROM transactions t
GROUP BY t.user_id, year, month, t.type;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update wallet balance on transaction insert/update/delete
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.type = 'income' THEN
      UPDATE wallets SET balance = balance + NEW.amount, updated_at = NOW()
      WHERE id = NEW.wallet_id;
    ELSIF NEW.type = 'expense' THEN
      UPDATE wallets SET balance = balance - NEW.amount, updated_at = NOW()
      WHERE id = NEW.wallet_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.type = 'income' THEN
      UPDATE wallets SET balance = balance - OLD.amount, updated_at = NOW()
      WHERE id = OLD.wallet_id;
    ELSIF OLD.type = 'expense' THEN
      UPDATE wallets SET balance = balance + OLD.amount, updated_at = NOW()
      WHERE id = OLD.wallet_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Reverse old, apply new
    IF OLD.type = 'income' THEN
      UPDATE wallets SET balance = balance - OLD.amount WHERE id = OLD.wallet_id;
    ELSIF OLD.type = 'expense' THEN
      UPDATE wallets SET balance = balance + OLD.amount WHERE id = OLD.wallet_id;
    END IF;
    IF NEW.type = 'income' THEN
      UPDATE wallets SET balance = balance + NEW.amount, updated_at = NOW() WHERE id = NEW.wallet_id;
    ELSIF NEW.type = 'expense' THEN
      UPDATE wallets SET balance = balance - NEW.amount, updated_at = NOW() WHERE id = NEW.wallet_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_wallet_balance
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_wallet_balance();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_wallets_updated_at
  BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_wallet    ON transactions(wallet_id);
CREATE INDEX idx_transactions_category  ON transactions(category_id);
CREATE INDEX idx_budgets_user_period    ON budgets(user_id, year, month);
CREATE INDEX idx_notifications_user     ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_reminders_user         ON reminders(user_id, is_active, due_date);
CREATE INDEX idx_recurring_due          ON recurring_templates(next_due_date) WHERE is_active = TRUE;
