-- Migrasi untuk memperbaiki return type dari RPC agar mengembalikan fcm_token
-- Ini diperlukan agar Edge Functions FCM Push bisa mengirim notifikasi langsung.

DROP FUNCTION IF EXISTS public.check_budget_alerts();

CREATE OR REPLACE FUNCTION public.check_budget_alerts()
 RETURNS TABLE(user_id uuid, fcm_token text, category_name text, percentage numeric, budget_limit numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  v_start_date DATE;
  v_end_date DATE;
  v_total_spent NUMERIC;
  v_current_month INT;
  v_current_year INT;
  v_amount_formatted TEXT;
  v_spent_formatted TEXT;
  v_percentage NUMERIC;
  v_fcm_token TEXT;
BEGIN
  v_current_month := EXTRACT(MONTH FROM CURRENT_DATE AT TIME ZONE 'Asia/Jakarta')::INT;
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE AT TIME ZONE 'Asia/Jakarta')::INT;

  FOR r IN 
    SELECT b.*, c.name as cat_name
    FROM budgets b
    JOIN categories c ON b.category_id = c.id
    WHERE b.month = v_current_month AND b.year = v_current_year
  LOOP
    v_start_date := make_date(r.year, r.month, 1);
    v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

    SELECT COALESCE(SUM(transactions.amount), 0) INTO v_total_spent
    FROM transactions
    WHERE transactions.user_id = r.user_id
      AND transactions.category_id = r.category_id
      AND transactions.type = 'expense'
      AND transactions.transaction_date >= v_start_date
      AND transactions.transaction_date <= v_end_date;

    IF r.amount > 0 THEN
      v_percentage := (v_total_spent / r.amount) * 100;
    ELSE
      v_percentage := 0;
    END IF;

    -- Fetch FCM token
    SELECT profiles.fcm_token INTO v_fcm_token
    FROM profiles
    WHERE profiles.id = r.user_id;

    v_amount_formatted := 'Rp ' || replace(to_char(r.amount, 'FM999,999,999,999'), ',', '.');
    v_spent_formatted := 'Rp ' || replace(to_char(v_total_spent, 'FM999,999,999,999'), ',', '.');

    IF v_total_spent >= r.amount THEN
      IF NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE notifications.user_id = r.user_id
          AND type = 'budget_alert'
          AND (metadata->>'category_id') = r.category_id::text
          AND (metadata->>'month') = r.month::text
          AND (metadata->>'year') = r.year::text
          AND (metadata->>'threshold') = '100'
      ) THEN
        INSERT INTO notifications (
          user_id, title, body, type, action_url, metadata
        ) VALUES (
          r.user_id,
          'Anggaran Melebihi Batas!',
          'Pengeluaran Anda untuk kategori "' || r.cat_name || '" sebesar ' || v_spent_formatted || ' telah melebihi batas anggaran ' || v_amount_formatted || '.',
          'budget_alert',
          '/dashboard/budgets',
          jsonb_build_object('category_id', r.category_id, 'month', r.month, 'year', r.year, 'threshold', '100')
        );
        
        user_id := r.user_id;
        fcm_token := v_fcm_token;
        category_name := r.cat_name;
        percentage := v_percentage;
        budget_limit := r.amount;
        RETURN NEXT;
      END IF;
    ELSIF v_total_spent >= (r.amount * 0.8) THEN
      IF NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE notifications.user_id = r.user_id
          AND type = 'budget_alert'
          AND (metadata->>'category_id') = r.category_id::text
          AND (metadata->>'month') = r.month::text
          AND (metadata->>'year') = r.year::text
          AND (metadata->>'threshold') = '80'
      ) THEN
        INSERT INTO notifications (
          user_id, title, body, type, action_url, metadata
        ) VALUES (
          r.user_id,
          'Anggaran Mendekati Batas',
          'Pengeluaran Anda untuk kategori "' || r.cat_name || '" sebesar ' || v_spent_formatted || ' telah mencapai 80% dari batas anggaran ' || v_amount_formatted || '.',
          'budget_alert',
          '/dashboard/budgets',
          jsonb_build_object('category_id', r.category_id, 'month', r.month, 'year', r.year, 'threshold', '80')
        );
        
        user_id := r.user_id;
        fcm_token := v_fcm_token;
        category_name := r.cat_name;
        percentage := v_percentage;
        budget_limit := r.amount;
        RETURN NEXT;
      END IF;
    END IF;
  END LOOP;
END;
$function$;

---------------------------------------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.process_due_recurring_templates();

CREATE OR REPLACE FUNCTION public.process_due_recurring_templates()
 RETURNS TABLE(user_id uuid, fcm_token text, title text, type text, amount numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  v_trx_id UUID;
  v_next_due DATE;
  v_amount_formatted TEXT;
  v_fcm_token TEXT;
BEGIN
  FOR r IN 
    SELECT t.*, w.name as wallet_name, c.name as category_name
    FROM recurring_templates t
    JOIN wallets w ON t.wallet_id = w.id
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.is_active = TRUE
      AND t.next_due_date <= CURRENT_DATE
      AND (t.end_date IS NULL OR t.next_due_date <= t.end_date)
  LOOP
    INSERT INTO transactions (
      user_id, wallet_id, category_id, recurring_id, 
      amount, type, description, notes, transaction_date, is_recurring
    ) VALUES (
      r.user_id, r.wallet_id, r.category_id, r.id, 
      r.amount, r.type, r.name, r.notes, r.next_due_date, TRUE
    ) RETURNING id INTO v_trx_id;

    v_amount_formatted := 'Rp ' || replace(to_char(r.amount, 'FM999,999,999,999'), ',', '.');

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

    CASE r.frequency
      WHEN 'daily' THEN v_next_due := (r.next_due_date + INTERVAL '1 day')::DATE;
      WHEN 'weekly' THEN v_next_due := (r.next_due_date + INTERVAL '1 week')::DATE;
      WHEN 'monthly' THEN v_next_due := (r.next_due_date + INTERVAL '1 month')::DATE;
      WHEN 'yearly' THEN v_next_due := (r.next_due_date + INTERVAL '1 year')::DATE;
      ELSE v_next_due := (r.next_due_date + INTERVAL '1 month')::DATE;
    END CASE;

    IF r.end_date IS NOT NULL AND v_next_due > r.end_date THEN
      UPDATE recurring_templates 
      SET next_due_date = v_next_due, is_active = FALSE 
      WHERE id = r.id;
    ELSE
      UPDATE recurring_templates 
      SET next_due_date = v_next_due 
      WHERE id = r.id;
    END IF;

    -- Fetch FCM token
    SELECT profiles.fcm_token INTO v_fcm_token
    FROM profiles
    WHERE profiles.id = r.user_id;

    user_id := r.user_id;
    fcm_token := v_fcm_token;
    title := r.name;
    type := r.type::text;
    amount := r.amount;
    RETURN NEXT;
  END LOOP;
END;
$function$;
