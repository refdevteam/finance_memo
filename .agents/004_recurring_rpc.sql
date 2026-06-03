-- ============================================================
-- Fimo - RPC for Processing Recurring Transactions
-- ============================================================

CREATE OR REPLACE FUNCTION process_due_recurring_templates()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
  v_trx_id UUID;
  v_count INT := 0;
  v_next_due DATE;
  v_amount_formatted TEXT;
BEGIN
  -- Loop through all active templates where next_due_date <= CURRENT_DATE
  FOR r IN 
    SELECT t.*, w.name as wallet_name, c.name as category_name
    FROM recurring_templates t
    JOIN wallets w ON t.wallet_id = w.id
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.is_active = TRUE
      AND t.next_due_date <= CURRENT_DATE
      AND (t.end_date IS NULL OR t.next_due_date <= t.end_date)
  LOOP
    -- 1. Insert transaction
    INSERT INTO transactions (
      user_id, wallet_id, category_id, recurring_id, 
      amount, type, description, notes, transaction_date, is_recurring
    ) VALUES (
      r.user_id, r.wallet_id, r.category_id, r.id, 
      r.amount, r.type, r.name, r.notes, r.next_due_date, TRUE
    ) RETURNING id INTO v_trx_id;

    -- Format Rupiah for notification (e.g. 150000 -> Rp 150.000)
    v_amount_formatted := 'Rp ' || replace(to_char(r.amount, 'FM999,999,999,999'), ',', '.');

    -- 2. Insert in-app notification
    INSERT INTO notifications (
      user_id, title, body, type, action_url, metadata
    ) VALUES (
      r.user_id,
      'Transaksi Berulang Diproses',
      'Transaksi berulang "' || r.name || '" sebesar ' || v_amount_formatted || ' berhasil dicatat untuk ' || r.wallet_name || '.',
      'recurring',
      '/dashboard/transactions',
      jsonb_build_object('transaction_id', v_trx_id, 'template_id', r.id)
    );

    -- 3. Calculate next due date
    CASE r.frequency
      WHEN 'daily' THEN v_next_due := (r.next_due_date + INTERVAL '1 day')::DATE;
      WHEN 'weekly' THEN v_next_due := (r.next_due_date + INTERVAL '1 week')::DATE;
      WHEN 'monthly' THEN v_next_due := (r.next_due_date + INTERVAL '1 month')::DATE;
      WHEN 'yearly' THEN v_next_due := (r.next_due_date + INTERVAL '1 year')::DATE;
      ELSE v_next_due := (r.next_due_date + INTERVAL '1 month')::DATE;
    END CASE;

    -- 4. Update the template's next due date
    -- If v_next_due is past end_date, deactivate it
    IF r.end_date IS NOT NULL AND v_next_due > r.end_date THEN
      UPDATE recurring_templates 
      SET next_due_date = v_next_due, is_active = FALSE 
      WHERE id = r.id;
    ELSE
      UPDATE recurring_templates 
      SET next_due_date = v_next_due 
      WHERE id = r.id;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', TRUE, 'processed_count', v_count);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$$;
