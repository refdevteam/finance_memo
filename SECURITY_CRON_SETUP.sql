-- ============================================================================
-- SECURITY_CRON_SETUP.sql  —  Langkah 4: pasang header x-cron-secret
-- pada 3 Scheduled Functions: send-reminder, process-recurring, budget-alert
-- ----------------------------------------------------------------------------
-- MENGAPA LANGKAH INI WAJIB:
--   Setelah patch, ketiga Edge Function itu menolak SETIAP pemanggil yang
--   tidak membawa CRON_SECRET:
--     - CRON_SECRET belum diset  -> 503 "Server misconfigured" (fail-closed)
--     - header salah/tidak ada   -> 401 "Unauthorized"
--   Scheduler (pg_cron + pg_net) TIDAK otomatis mengirim header itu.
--   Jadi begitu fungsi ter-deploy, tanpa langkah ini cron berhenti diam-diam
--   (pengingat, transaksi berulang, dan alert anggaran mati total).
--
-- PRASYARAT (urut):
--   (2) supabase secrets set CRON_SECRET=<nilai acak panjang>
--       catat nilainya — HARUS sama dengan v_secret pada BAGIAN B
--   (4) skrip ini, di Supabase SQL Editor
--   (lalu) deploy ulang ketiga Edge Function  (kalau belum)
--
-- CARA PAKAI:
--   BAGIAN A : hanya membaca. Jalankan dulu, SALIN hasilnya ke tempat aman —
--              itu cadangan perintah cron lama kalau perlu dikembalikan.
--   BAGIAN B : satu-satunya bagian yang menulis. Idempoten (boleh diulang).
--              Job yang polanya tidak dikenali TIDAK diubah, hanya
--              dilaporkan sebagai PERINGATAN -> tambahkan header manual.
--   BAGIAN C : verifikasi hasil.
--   BAGIAN D : opsional — cek respons HTTP setelah cron berikutnya jalan.
--
-- CADANGAN (kembalikan seperti semula):
--   SELECT cron.alter_job(job_id := <jobid>, command := '<perintah lama dari BAGIAN A>');
-- ============================================================================


-- ============================================================================
-- BAGIAN A — DIAGNOSA (read-only)
-- ============================================================================

-- A0. Ekstensi. Kalau pg_cron TIDAK muncul di sini, penjadwalan Anda bukan
--     pg_cron -> hentikan, kirimkan hasilnya ke saya (skrip ini tidak berlaku).
SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('pg_cron', 'pg_net')
ORDER BY 1;

-- A1. Semua job cron yang memanggil Edge Function.
--     SALIN keluaran ini sebelum lanjut ke BAGIAN B.
SELECT j.jobid,
       j.jobname,
       j.schedule,
       j.active,
       (j.command ~ 'x-cron-secret') AS sudah_ada_header,
       j.command
FROM cron.job j
WHERE j.command ILIKE '%/functions/v1/%'
ORDER BY j.jobid;

-- A2. Kelengkapan: ketiga fungsi yang dijadwalkan harus punya job.
--     "false" pada kolom PunyaJadwal = fungsi itu dijadwalkan di tempat lain
--     (Database Webhook / trigger) -> laporkan ke saya, jangan lanjut.
SELECT t.fungsi                                        AS "EdgeFunction",
       EXISTS (SELECT 1 FROM cron.job j
               WHERE j.command ILIKE '%/functions/v1/' || t.fungsi || '%')
                                                       AS "PunyaJadwal",
       EXISTS (SELECT 1 FROM cron.job j
               WHERE j.command ILIKE '%/functions/v1/' || t.fungsi || '%'
                 AND j.command ~ 'x-cron-secret')      AS "HeaderTerpasang"
FROM (VALUES ('send-reminder'),
             ('process-recurring'),
             ('budget-alert')) AS t(fungsi)
ORDER BY 1;


-- ============================================================================
-- BAGIAN B — TERAPKAN (satu-satunya bagian yang menulis)
-- ----------------------------------------------------------------------------
-- GANTI v_secret DI BAWAH INI dengan nilai yang SAMA dengan CRON_SECRET
-- yang Anda set pada langkah 2 (supabase secrets set CRON_SECRET=...).
-- ============================================================================
DO $$
DECLARE
  v_secret      text := 'GANTI_DENGAN_NILAI_CRON_SECRET';
  r             record;
  v_new         text;
  v_terpasang   int := 0;
  v_sudah       int := 0;
  v_lewati      int := 0;
  v_gagal       int := 0;
BEGIN
  -- ---- validasi, SEBELUM ada perubahan apa pun ----
  -- Kata 'GANTI' dicek terpisah dari placeholder, supaya penukaran teks
  -- massal pada v_secret tidak membuat penjaga ini berbalik menolak
  -- nilai yang justru sudah benar.
  IF v_secret LIKE '%GANTI%' THEN
    RAISE EXCEPTION 'Placeholder belum diganti. Isi v_secret dengan nilai yang sama dengan CRON_SECRET.';
  END IF;
  IF v_secret !~ '^[A-Za-z0-9_-]{24,128}$' THEN
    RAISE EXCEPTION 'v_secret tidak valid. Pakai 24-128 karakter [A-Za-z0-9_-] saja (contoh: hasil openssl rand -hex 32).';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE EXCEPTION 'Ekstensi pg_cron tidak terpasang; penjadwalan bukan pg_cron.';
  END IF;

  FOR r IN
    SELECT j.jobid, j.jobname, j.schedule, j.command
    FROM cron.job j
    WHERE j.command ILIKE '%/functions/v1/%'
    ORDER BY j.jobid
  LOOP
    -- sudah ada -> biarkan (idempoten)
    IF r.command ~ 'x-cron-secret' THEN
      v_sudah := v_sudah + 1;
      RAISE NOTICE 'LEWAT (sudah ada header): %', r.jobname;
      CONTINUE;
    END IF;

    -- Susun perintah baru dengan menyisipkan header x-cron-secret.
    -- Tiga bentuk umum ditangani; apa pun yang tidak dikenali TIDAK diubah.
    v_new := NULL;

    -- (1) headers:='{...}'::jsonb   atau   headers:='{"a":"b"}'
    IF r.command ~* '(headers\s*(?:=>|:=)\s*''\s*\{)' THEN
      v_new := regexp_replace(r.command,
                              '(headers\s*(?:=>|:=)\s*''\s*\{)',
                              '\1"x-cron-secret":"' || v_secret || '",',
                              'i');

    -- (2) headers:=jsonb_build_object(...)
    ELSIF r.command ~* '(headers\s*(?:=>|:=)\s*jsonb_build_object\s*\()' THEN
      v_new := regexp_replace(r.command,
                              '(headers\s*(?:=>|:=)\s*jsonb_build_object\s*\()'::text,
                              '\1''x-cron-secret'',''' || v_secret || ''','::text,
                              'i');

    -- (3) tidak ada argumen headers sama sekali -> sisipkan setelah http_post(
    ELSIF r.command ~* '(net\s*\.\s*http_(?:post|get|delete)\s*\()' THEN
      v_new := regexp_replace(r.command,
                              '(net\s*\.\s*http_(?:post|get|delete)\s*\()'::text,
                              '\1headers:=jsonb_build_object(''x-cron-secret'',''' || v_secret || '''),'::text,
                              'i');
    END IF;

    -- Tolak hasil yang tidak meyakinkan
    IF v_new IS NULL OR v_new = r.command OR v_new !~ 'x-cron-secret'
       OR v_new NOT ILIKE '%/functions/v1/%' THEN
      v_lewati := v_lewati + 1;
      RAISE WARNING 'TIDAK DIUBAH: %  -> pola perintah tidak dikenali, tambahkan header x-cron-secret manual di Dashboard (Integrations > Cron).', r.jobname;
      RAISE NOTICE 'Perintah lama: %', r.command;
      CONTINUE;
    END IF;

    -- Terapkan: alter_job (pertahankan jadwal & database), fallback cron.schedule
    BEGIN
      PERFORM cron.alter_job(job_id := r.jobid, command := v_new);
      v_terpasang := v_terpasang + 1;
      RAISE NOTICE 'TERPASANG: %', r.jobname;
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        PERFORM cron.schedule(r.jobname, r.schedule, v_new);
        v_terpasang := v_terpasang + 1;
        RAISE NOTICE 'TERPASANG (via cron.schedule): %', r.jobname;
      EXCEPTION WHEN OTHERS THEN
        v_gagal := v_gagal + 1;
        RAISE WARNING 'GAGAL: % -> %', r.jobname, SQLERRM;
      END;
    END;
  END LOOP;

  RAISE NOTICE 'RINGKASAN -> terpasang: % | sudah ada: % | dilewati: % | gagal: %',
               v_terpasang, v_sudah, v_lewati, v_gagal;
  IF v_lewati > 0 OR v_gagal > 0 THEN
    RAISE WARNING 'Masih ada job TANPA header. Sampai semuanya beres, cron untuk job tersebut akan menerima 401/503.';
  END IF;
END $$;


-- ============================================================================
-- BAGIAN B2 — TIMEOUT pg_net (WAJIB)
-- ============================================================================
-- Default `net.http_post` hanya menunggu 5000 ms. Edge Function bisa butuh
-- 7-8 detik saat cold start, sehingga respons dicatat timeout walau fungsinya
-- tetap selesai. Kegagalannya tidak terlihat karena `cron.job_run_details`
-- tetap menulis "succeeded" (job hanya melakukan enqueue). Naikkan ke 30 detik.
DO $$
DECLARE
  r     record;
  v_new text;
BEGIN
  FOR r IN
    SELECT jobid, jobname, command
    FROM cron.job
    WHERE command ILIKE '%/functions/v1/%'
      AND command NOT LIKE '%timeout_milliseconds%'
  LOOP
    v_new := regexp_replace(
      r.command,
      '\)\s*;\s*$',
      E', timeout_milliseconds := 30000\n  );'
    );

    IF v_new <> r.command AND v_new LIKE '%timeout_milliseconds%' THEN
      PERFORM cron.alter_job(job_id := r.jobid, command := v_new);
      RAISE NOTICE 'TIMEOUT 30s DIPASANG: %', r.jobname;
    ELSE
      RAISE WARNING 'TIDAK DIUBAH (pola tidak dikenali): %', r.jobname;
    END IF;
  END LOOP;
END $$;


-- ============================================================================
-- BAGIAN C — VERIFIKASI
-- ============================================================================

-- C1. Semua job yang memanggil Edge Function: header & timeout harus true.
SELECT j.jobname,
       j.schedule,
       j.active,
       (j.command ~ 'x-cron-secret')        AS header_terpasang,
       (j.command LIKE '%timeout_milliseconds%') AS timeout_terpasang,
       substring(j.command from '/functions/v1/[a-z0-9-]+') AS target,
       j.command
FROM cron.job j
WHERE j.command ILIKE '%/functions/v1/%'
ORDER BY j.jobname;

-- C2. Kesimpulan per fungsi. Semua baris harus bernilai true.
SELECT t.fungsi                                        AS "EdgeFunction",
       EXISTS (SELECT 1 FROM cron.job j
               WHERE j.command ILIKE '%/functions/v1/' || t.fungsi || '%'
                 AND j.command ~ 'x-cron-secret')      AS "HeaderTerpasang",
       EXISTS (SELECT 1 FROM cron.job j
               WHERE j.command ILIKE '%/functions/v1/' || t.fungsi || '%'
                 AND j.command LIKE '%timeout_milliseconds%') AS "TimeoutTerpasang"
FROM (VALUES ('send-reminder'),
             ('process-recurring'),
             ('budget-alert')) AS t(fungsi)
ORDER BY 1;


-- ============================================================================
-- BAGIAN D — OPSIONAL: bukti respons HTTP (jalankan terpisah)
-- ----------------------------------------------------------------------------
-- pg_net hanya menyimpan respons 6 jam terakhir, jadi jalankan SETELAH cron
-- berikutnya. status_code 200 = header diterima; 401/503 = header belum pas
-- atau CRON_SECRET belum diset di Edge Function.
-- Kalau error "schema net does not exist", lewati saja.
-- ============================================================================
-- SELECT id,
--        status_code,
--        error_msg,
--        left(content, 300) AS content,
--        created
-- FROM net._http_response
-- WHERE created > now() - interval '6 hours'
-- ORDER BY created DESC
-- LIMIT 20;
