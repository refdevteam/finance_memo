-- ============================================================================
-- SKRIP VERIFIKASI POSTUR KEAMANAN DATABASE — Fimo
-- Tanggal: 5 Oktober 2026
--
-- CARA PAKAI:
--   Supabase Dashboard -> SQL Editor -> tempel seluruh isi file ini -> Run.
--   Hasilnya SATU tabel. Kirimkan balik tabel itu.
--
--   Seluruh isi file ini HANYA SELECT — tidak ada yang mengubah data.
--   Blok opsional (pg_cron / pg_net) sengaja dikomentari di bagian bawah
--   karena bisa error bila ekstensinya tidak terpasang.
--
-- CARA MEMBACA KOLOM status:
--   KRITIS   -> temuan nyata, harus diperbaiki
--   PERHATIAN-> perlu dipastikan/diselesaikan
--   INFO     -> fakta untuk pembandingan dengan repositori
--   OK       -> sudah sesuai harapan
--
-- CATATAN: skrip ini membaca keadaan PRODUCTION yang ternyata pernah diubah
-- langsung di luar file migrasi (lihat proggress/supabase-optimizer).
-- Tujuannya menemukan selisih (drift) antara DB dan repositori.
-- ============================================================================

SELECT * FROM (

  -- ------------------------------------------------------------------
  -- 1. KEBIJAKAN PADA TABEL notifications
  --    Harapan: tidak ada lagi INSERT WITH CHECK yang terbuka untuk
  --    peran selain service_role. (temuan 3.2)
  -- ------------------------------------------------------------------
  SELECT 1 AS ord,
         '1. Policy: notifications' AS bagian,
         p.policyname AS pemeriksaan,
         'cmd=' || p.cmd
           || ' | roles=' || COALESCE(NULLIF(p.roles::text, ''), '(publik/semua peran)')
           || ' | with_check=' || COALESCE(p.with_check, '-') AS detail,
         CASE
           WHEN p.cmd IN ('INSERT', 'ALL')
            AND p.with_check IN ('true', '(true)')
            AND COALESCE(p.roles::text, '') NOT LIKE '%service_role%'
            AND COALESCE(p.roles::text, '') NOT LIKE '%postgres%'
             THEN 'KRITIS'
           WHEN p.cmd IN ('DELETE', 'UPDATE')
            AND COALESCE(p.with_check, '') NOT LIKE '%auth.uid()%'
            AND COALESCE(p.qual, '')    NOT LIKE '%auth.uid()%'
            AND COALESCE(p.roles::text, '') NOT LIKE '%service_role%'
             THEN 'PERHATIAN'
           ELSE 'OK'
         END AS status
  FROM pg_policies p
  WHERE p.schemaname = 'public' AND p.tablename = 'notifications'

  UNION ALL

  -- ------------------------------------------------------------------
  -- 2. KEBIJAKAN LAIN YANG WITH CHECK-NYA `true` (seluruh public schema)
  --    Menangkap lubang serupa di tabel lain.
  -- ------------------------------------------------------------------
  SELECT 2,
         '2. Policy lain: WITH CHECK (true)',
         p.tablename || ' / ' || p.policyname,
         'cmd=' || p.cmd
           || ' | roles=' || COALESCE(NULLIF(p.roles::text, ''), '(publik/semua peran)')
           || ' | with_check=' || COALESCE(p.with_check, '-'),
         CASE WHEN COALESCE(p.roles::text, '') NOT LIKE '%service_role%'
                   AND COALESCE(p.roles::text, '') NOT LIKE '%postgres%'
              THEN 'KRITIS' ELSE 'INFO' END
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND p.with_check IN ('true', '(true)')
    AND p.tablename <> 'notifications'

  UNION ALL

  -- ------------------------------------------------------------------
  -- 3. ROW LEVEL SECURITY PER TABEL
  --    Tabel tanpa RLS = terbaca/ditulis siapa pun yang punya GRANT,
  --    tanpa penyaringan per-pengguna.
  --    (menjawab keraguan: "hanya 5 file migrasi vs banyak tabel")
  -- ------------------------------------------------------------------
  SELECT 3,
         '3. RLS per tabel public',
         c.relname,
         'rls=' || c.relrowsecurity
           || ' | force=' || c.relforcerowsecurity
           || ' | jumlah_policy=' || (
                SELECT count(*) FROM pg_policies p
                WHERE p.schemaname = n.nspname AND p.tablename = c.relname
              ),
         CASE WHEN NOT c.relrowsecurity THEN 'KRITIS'
              WHEN (SELECT count(*) FROM pg_policies p
                    WHERE p.schemaname = n.nspname AND p.tablename = c.relname) = 0
                THEN 'PERHATIAN'
              ELSE 'OK' END
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'

  UNION ALL

  -- ------------------------------------------------------------------
  -- 4. GRANT TABEL UNTUK PERAN `anon`
  --    Kunci anon bersifat publik (NEXT_PUBLIC_SUPABASE_ANON_KEY),
  --    jadi ini persis modal penyerang. Harapan: SEMUA false.
  -- ------------------------------------------------------------------
  SELECT 4,
         '4. GRANT tabel utk peran anon',
         c.relname,
         'select=' || has_table_privilege('anon', c.oid, 'SELECT')
           || ' | insert=' || has_table_privilege('anon', c.oid, 'INSERT')
           || ' | update=' || has_table_privilege('anon', c.oid, 'UPDATE')
           || ' | delete=' || has_table_privilege('anon', c.oid, 'DELETE'),
         CASE WHEN has_table_privilege('anon', c.oid, 'SELECT')
                 OR has_table_privilege('anon', c.oid, 'INSERT')
                 OR has_table_privilege('anon', c.oid, 'UPDATE')
                 OR has_table_privilege('anon', c.oid, 'DELETE')
              THEN 'KRITIS' ELSE 'OK' END
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'

  UNION ALL

  -- ------------------------------------------------------------------
  -- 5. PRIVILEGE SEMUA FUNGSI DI SKEMA public
  --    Inti temuan 3.5: RPC cron harus HANYA bisa dipanggil service_role,
  --    karena kalau authenticated bisa, seluruh penguncian Edge Function
  --    bisa dilewati langsung lewat /rest/v1/rpc/.
  --
  --    Harapan:
  --      anon = FALSE untuk semua fungsi
  --      auth = TRUE  hanya execute_wallet_transfer dan auth_uid
  --      svc  = TRUE  untuk check_budget_alerts,
  --                   process_due_recurring_templates, process_due_reminders
  -- ------------------------------------------------------------------
  SELECT 5,
         '5. Privilege fungsi public',
         p.proname,
         'anon=' || has_function_privilege('anon', p.oid, 'EXECUTE')
           || ' | auth=' || has_function_privilege('authenticated', p.oid, 'EXECUTE')
           || ' | svc=' || has_function_privilege('service_role', p.oid, 'EXECUTE'),
         CASE
           WHEN p.proname IN ('check_budget_alerts',
                              'process_due_recurring_templates',
                              'process_due_reminders')
                AND has_function_privilege('anon', p.oid, 'EXECUTE')
             THEN 'KRITIS'
           WHEN p.proname IN ('check_budget_alerts',
                              'process_due_recurring_templates',
                              'process_due_reminders')
                AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
             THEN 'KRITIS'
           WHEN p.proname <> 'auth_uid'
                AND has_function_privilege('anon', p.oid, 'EXECUTE')
             THEN 'PERHATIAN'
           ELSE 'INFO' END
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'

  UNION ALL

  -- ------------------------------------------------------------------
  -- 6. DETAIL FUNGSI SECURITY DEFINER
  --    - proconfig harus memuat search_path statik (anti search-path hijack)
  --    - execute_wallet_transfer harus memuat auth.uid()  (temuan 3.5)
  --    - update_wallet_balance harus memuat user_id = NEW.user_id (temuan 3.4)
  -- ------------------------------------------------------------------
  SELECT 6,
         '6. Fungsi SECURITY DEFINER',
         p.proname,
         'search_path_statis='
           || CASE WHEN COALESCE(p.proconfig, '{}')::text ILIKE '%search_path%'
                   THEN 'YA' ELSE 'TIDAK' END
           || ' | proconfig=' || COALESCE(p.proconfig, '{}')::text
           || ' | cek_auth_uid='
           || CASE WHEN p.prosrc ILIKE '%auth.uid()%' THEN 'YA' ELSE 'TIDAK' END
           || ' | cek_pemilik_wallet='
           || CASE WHEN p.prosrc ILIKE '%user_id = NEW.user_id%' THEN 'YA' ELSE 'TIDAK' END,
         CASE
           WHEN p.proname = 'execute_wallet_transfer'
                AND p.prosrc NOT ILIKE '%auth.uid()%'   THEN 'PERHATIAN'
           WHEN p.proname = 'update_wallet_balance'
                AND p.prosrc NOT ILIKE '%user_id = NEW.user_id%' THEN 'KRITIS'
           WHEN COALESCE(p.proconfig, '{}')::text NOT ILIKE '%search_path%'
                AND p.proname IN ('auth_uid', 'update_wallet_balance',
                                  'handle_new_user', 'execute_wallet_transfer')
             THEN 'PERHATIAN'
           ELSE 'OK' END
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prosecdef

  UNION ALL

  -- ------------------------------------------------------------------
  -- 7. VIEW DI skema public
  --    monthly_summary harus security_invoker = true; kalau tidak, hak
  --    dibaca berdasarkan PEMILIK view sehingga ringkasan pengeluaran
  --    lintas pengguna bisa bocor.
  -- ------------------------------------------------------------------
  SELECT 7,
         '7. View public',
         c.relname,
         'reloptions=' || COALESCE(c.reloptions::text, 'kosong'),
         CASE WHEN c.relname = 'monthly_summary'
                   AND COALESCE(c.reloptions::text, '') NOT ILIKE '%security_invoker=true%'
              THEN 'KRITIS' ELSE 'INFO' END
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm')

  UNION ALL

  -- ------------------------------------------------------------------
  -- 8. DRIFT: fungsi SECURITY DEFINER yang dikenal repositori
  --    Karena Supabase SQL Editor hanya menampilkan hasil statement
  --    terakhir, daftar drift dinyatakan sebagai fakta per fungsi
  --    (kombinasi baris ini + jumlah fungsi di bagian 5).
  --    Fungsi di luar daftar ini = tidak ada di file mana pun di repo.
  -- ------------------------------------------------------------------
  SELECT 8,
         '8. Fungsi dikenal repositori',
         p.proname,
         'tanda tangan=' || p.oid::regprocedure::text,
         'OK'
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN ('auth_uid', 'update_wallet_balance', 'handle_new_user',
                      'touch_updated_at', 'execute_wallet_transfer',
                      'check_budget_alerts', 'process_due_recurring_templates',
                      'bills_shared_with_me')

  UNION ALL

  -- ------------------------------------------------------------------
  -- 9. FUNGSI SECURITY DEFINER YANG TIDAK DIKENAL REPOSITORI
  --    Daftar ini = kandidat drift yang perlu dimasukkan ke file migrasi.
  --    Catatan: process_due_reminders sudah pasti ada di DB tapi tidak
  --    ada definisinya di repo — itu memang temuan 5.2.
  -- ------------------------------------------------------------------
  SELECT 9,
         '9. DRIFT: fungsi tak dikenal repo',
         p.proname,
         'tanda tangan=' || p.oid::regprocedure::text,
         CASE WHEN p.proname NOT IN (
                 'auth_uid', 'update_wallet_balance', 'handle_new_user',
                 'touch_updated_at', 'execute_wallet_transfer',
                 'check_budget_alerts', 'process_due_recurring_templates',
                 'bills_shared_with_me',
                 -- Ditangkap ke file migrasi 20261009120000_capture_drift_functions
                 'process_due_reminders', 'update_user_streak',
                 -- Dibuat oleh migrasi 20261005100000_security_hardening
                 'consume_scan_quota'
               ) THEN 'PERHATIAN' ELSE 'OK' END
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prosecdef

  UNION ALL

  -- ------------------------------------------------------------------
  -- 10. TABEL KUNCI: ada/tidak + status RLS
  --     ai_insights: DDL-nya tidak ada sama sekali di repositori.
  -- ------------------------------------------------------------------
  SELECT 10,
         '10. Tabel kunci',
         t.tbl,
         CASE WHEN to_regclass('public.' || t.tbl) IS NULL
                THEN 'TIDAK ADA di database'
              ELSE 'ada | rls=' || (
                     SELECT c.relrowsecurity FROM pg_class c
                     JOIN pg_namespace n ON n.oid = c.relnamespace
                     WHERE n.nspname = 'public' AND c.relname = t.tbl
                   )::text
                   || ' | policy=' || (
                     SELECT count(*) FROM pg_policies p
                     WHERE p.schemaname = 'public' AND p.tablename = t.tbl
                   )
              END,
         CASE WHEN to_regclass('public.' || t.tbl) IS NULL THEN 'KRITIS'
              WHEN COALESCE((SELECT c.relrowsecurity FROM pg_class c
                             JOIN pg_namespace n ON n.oid = c.relnamespace
                             WHERE n.nspname = 'public' AND c.relname = t.tbl),
                            FALSE) = FALSE THEN 'KRITIS'
              WHEN (SELECT count(*) FROM pg_policies p
                    WHERE p.schemaname = 'public' AND p.tablename = t.tbl) = 0
                THEN 'PERHATIAN'
              ELSE 'OK' END
  FROM (VALUES
         ('ai_insights'),
         ('notifications'),
         ('split_bills'),
         ('split_bill_shares'),
         ('last_bill_partners'),
         ('profiles'),
         ('wallets'),
         ('receipts'),
         ('budgets'),
         ('reminders')
       ) AS t(tbl)

  UNION ALL

  -- ------------------------------------------------------------------
  -- 11. KEBIJAKAN STORAGE UNTUK BUCKET receipts
  --     Harapan: upload/read/delete dibatasi folder {auth.uid()} sendiri.
  -- ------------------------------------------------------------------
  SELECT 11,
         '11. Policy storage: receipts',
         p.policyname,
         'cmd=' || p.cmd
           || ' | roles=' || COALESCE(NULLIF(p.roles::text, ''), '(publik/semua peran)')
           || ' | using=' || COALESCE(p.qual, '-')
           || ' | with_check=' || COALESCE(p.with_check, '-'),
         CASE WHEN p.cmd IN ('INSERT', 'ALL')
                   AND COALESCE(p.with_check, 'x') NOT LIKE '%auth.uid()%'
              THEN 'KRITIS' ELSE 'OK' END
  FROM pg_policies p
  WHERE p.schemaname = 'storage' AND p.tablename = 'objects'
    AND p.policyname ILIKE '%receipt%'

) AS audit
ORDER BY ord, status DESC, pemeriksaan;


-- ============================================================================
-- BLOK OPSIONAL — jalankan TERPISAH setelah query di atas.
-- Dikomentari karena bisa error bila ekstensinya tidak terpasang.
-- ============================================================================

-- A) Jadwal pg_cron (apakah cron DB memanggil RPC langsung, tanpa Edge Function?):
-- SELECT jobid, schedule, command, nodename, database FROM cron.job ORDER BY jobid;

-- B) Respons HTTP terakhir dari pg_net (hanya disimpan 6 jam).
--    Kolom: id, status_code, content_type, headers, content, timed_out, error_msg, created
-- SELECT id, status_code, error_msg, timed_out, left(content, 300) AS content, created
-- FROM net._http_response
-- WHERE status_code >= 400 OR error_msg IS NOT NULL
-- ORDER BY created DESC LIMIT 20;

-- C) Ekstensi terpasang:
-- SELECT extname, extversion FROM pg_extension ORDER BY extname;

-- D) Bucket receipts (public? ada limit MIME?):
-- SELECT id, public, file_size_limit, allowed_mime_types
-- FROM storage.buckets WHERE id = 'receipts';

-- E) Varian ringkas untuk bagian 1:
-- SELECT policyname, roles, cmd, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'notifications'
-- ORDER BY policyname;

-- F) Daftar SEMUA fungsi (untuk menghitung drift bila bagian 5 terlalu panjang):
-- SELECT p.proname, p.prosecdef, coalesce(p.proconfig, '{}') AS proconfig,
--        has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec
-- FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public' ORDER BY 1;
