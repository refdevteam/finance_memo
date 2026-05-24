-- ============================================================
-- Fimo - RPC for Wallet Transfers
-- ============================================================

CREATE OR REPLACE FUNCTION execute_wallet_transfer(
  p_user_id UUID,
  p_from_wallet_id UUID,
  p_to_wallet_id UUID,
  p_amount NUMERIC,
  p_notes TEXT,
  p_transfer_date DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_from_trx_id UUID;
  v_to_trx_id UUID;
  v_transfer_id UUID;
BEGIN
  -- 1. Check if both wallets exist and belong to the user
  IF NOT EXISTS (SELECT 1 FROM wallets WHERE id = p_from_wallet_id AND user_id = p_user_id AND is_active = TRUE) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet asal tidak valid atau tidak aktif.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM wallets WHERE id = p_to_wallet_id AND user_id = p_user_id AND is_active = TRUE) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet tujuan tidak valid atau tidak aktif.');
  END IF;

  IF p_from_wallet_id = p_to_wallet_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet asal dan tujuan tidak boleh sama.');
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Jumlah transfer harus lebih dari 0.');
  END IF;

  -- 2. Insert 'transfer' transaction for from_wallet
  INSERT INTO transactions (user_id, wallet_id, amount, type, description, notes, transaction_date)
  VALUES (p_user_id, p_from_wallet_id, p_amount, 'transfer', 'Transfer Keluar', p_notes, p_transfer_date)
  RETURNING id INTO v_from_trx_id;

  -- 3. Insert 'transfer' transaction for to_wallet
  INSERT INTO transactions (user_id, wallet_id, amount, type, description, notes, transaction_date)
  VALUES (p_user_id, p_to_wallet_id, p_amount, 'transfer', 'Transfer Masuk', p_notes, p_transfer_date)
  RETURNING id INTO v_to_trx_id;

  -- 4. Update balances manually because 'transfer' type is ignored by trg_wallet_balance trigger
  UPDATE wallets SET balance = balance - p_amount, updated_at = NOW() WHERE id = p_from_wallet_id;
  UPDATE wallets SET balance = balance + p_amount, updated_at = NOW() WHERE id = p_to_wallet_id;

  -- 5. Insert wallet_transfers record
  INSERT INTO wallet_transfers (user_id, from_wallet_id, to_wallet_id, amount, from_trx_id, to_trx_id, notes, transfer_date)
  VALUES (p_user_id, p_from_wallet_id, p_to_wallet_id, p_amount, v_from_trx_id, v_to_trx_id, p_notes, p_transfer_date)
  RETURNING id INTO v_transfer_id;

  RETURN jsonb_build_object('success', true, 'transfer_id', v_transfer_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
