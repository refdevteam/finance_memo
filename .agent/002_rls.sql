-- ============================================================
-- Fimo - Row Level Security Policies
-- ============================================================

ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transfers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;

-- Helper: get current user id
CREATE OR REPLACE FUNCTION auth_uid() RETURNS UUID AS $$
  SELECT auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE POLICY "profiles: read own"
  ON profiles FOR SELECT USING (id = auth_uid());

CREATE POLICY "profiles: update own"
  ON profiles FOR UPDATE USING (id = auth_uid());

-- ============================================================
-- WALLETS
-- ============================================================
CREATE POLICY "wallets: all own"
  ON wallets FOR ALL USING (user_id = auth_uid());

-- ============================================================
-- CATEGORIES
-- ============================================================
-- Users can see their own categories AND default system categories (user_id IS NULL)
CREATE POLICY "categories: read own + defaults"
  ON categories FOR SELECT
  USING (user_id = auth_uid() OR user_id IS NULL);

CREATE POLICY "categories: manage own"
  ON categories FOR INSERT WITH CHECK (user_id = auth_uid());

CREATE POLICY "categories: update own"
  ON categories FOR UPDATE USING (user_id = auth_uid());

CREATE POLICY "categories: delete own"
  ON categories FOR DELETE USING (user_id = auth_uid() AND is_default = FALSE);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE POLICY "transactions: all own"
  ON transactions FOR ALL USING (user_id = auth_uid());

-- ============================================================
-- WALLET TRANSFERS
-- ============================================================
CREATE POLICY "wallet_transfers: all own"
  ON wallet_transfers FOR ALL USING (user_id = auth_uid());

-- ============================================================
-- RECEIPTS
-- ============================================================
CREATE POLICY "receipts: all own"
  ON receipts FOR ALL USING (user_id = auth_uid());

-- ============================================================
-- BUDGETS
-- ============================================================
CREATE POLICY "budgets: all own"
  ON budgets FOR ALL USING (user_id = auth_uid());

-- ============================================================
-- RECURRING TEMPLATES
-- ============================================================
CREATE POLICY "recurring_templates: all own"
  ON recurring_templates FOR ALL USING (user_id = auth_uid());

-- ============================================================
-- REMINDERS
-- ============================================================
CREATE POLICY "reminders: all own"
  ON reminders FOR ALL USING (user_id = auth_uid());

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE POLICY "notifications: read own"
  ON notifications FOR SELECT USING (user_id = auth_uid());

CREATE POLICY "notifications: update own"  -- mark as read
  ON notifications FOR UPDATE USING (user_id = auth_uid());

-- Service role can insert notifications (from Edge Functions)
CREATE POLICY "notifications: service insert"
  ON notifications FOR INSERT WITH CHECK (TRUE);

-- ============================================================
-- DEFAULT CATEGORIES (seed data - system-wide, user_id NULL)
-- ============================================================
INSERT INTO categories (id, user_id, name, icon, color, type, is_default) VALUES
-- Income
(uuid_generate_v4(), NULL, 'Gaji',         '💼', '#1D9E75', 'income', TRUE),
(uuid_generate_v4(), NULL, 'Bonus',        '🎁', '#3B8BD4', 'income', TRUE),
(uuid_generate_v4(), NULL, 'Freelance',    '💻', '#534AB7', 'income', TRUE),
(uuid_generate_v4(), NULL, 'Investasi',    '📈', '#BA7517', 'income', TRUE),
(uuid_generate_v4(), NULL, 'Lainnya',      '💰', '#888780', 'income', TRUE),
-- Expense
(uuid_generate_v4(), NULL, 'Makan & Minum','🍜', '#D85A30', 'expense', TRUE),
(uuid_generate_v4(), NULL, 'Transport',    '🚗', '#378ADD', 'expense', TRUE),
(uuid_generate_v4(), NULL, 'Belanja',      '🛒', '#D4537E', 'expense', TRUE),
(uuid_generate_v4(), NULL, 'Tagihan',      '📋', '#639922', 'expense', TRUE),
(uuid_generate_v4(), NULL, 'Kesehatan',    '❤️', '#E24B4A', 'expense', TRUE),
(uuid_generate_v4(), NULL, 'Hiburan',      '🎮', '#7F77DD', 'expense', TRUE),
(uuid_generate_v4(), NULL, 'Pendidikan',   '📚', '#1D9E75', 'expense', TRUE),
(uuid_generate_v4(), NULL, 'Cicilan',      '🏦', '#BA7517', 'expense', TRUE),
(uuid_generate_v4(), NULL, 'Tabungan',     '🏠', '#0F6E56', 'expense', TRUE),
(uuid_generate_v4(), NULL, 'Lainnya',      '💸', '#888780', 'expense', TRUE);
