# Laporan Audit Keamanan Siber — Fimo

**Tanggal audit:** 5 Oktober 2026 (diperbarui)
**Lingkup:** seluruh basis kode `finance_memo` (Next.js 14 App Router, Supabase, Firebase/FCM, Gemini), deployment Vercel, histori Git, dan dependensi.
**Pendekatan:** statis (baca kode + migrasi + histori Git), dinamis (probe permukaan serangan memakai hanya kunci `anon` publik), dan verifikasi dependensi (`npm audit`).

> **Status:** temuan berlabel **Diperbaiki** sudah dikerjakan dalam audit ini. Temuan **Masih Terbuka** membutuhkan tindakan manual — terutama menjalankan `SECURITY_VERIFY.sql` dan menyetel `CRON_SECRET`.

---

## 1. Ringkasan Status

| Area | Status | Keterangan |
|---|---|---|
| Autentikasi rute & halaman | 🟢 Kuat | Middleware memanggil `supabase.auth.getUser()`; semua halaman terproteksi di bawah `/dashboard` |
| Autentikasi Edge Function | 🔴 → 🟢 Diperbaiki | 4 fungsi semula terbuka tanpa autentikasi apa pun |
| RLS / otorisasi database | 🟠 Belum terverifikasi | Kebijakan `notifications` diperbaiki di migrasi, tapi **status production belum dikonfirmasi** → jalankan `SECURITY_VERIFY.sql` |
| Otorisasi Server Action | 🟢 Diperbaiki | 52 fungsi diperiksa; 1 tanpa autentikasi sudah diperbaiki |
| Kebocoran pesan error | 🟢 Diperbaiki | 40 titik dibersihkan |
| Kepatuhan GDPR | 🟢 Diperbaiki | File storage kini ikut terhapus; ekspor bertambah 4 tabel |
| Header keamanan HTTP | 🟢 Diperbaiki | HSTS, `object-src 'none'`, `upgrade-insecure-requests` |
| Dependensi (`next`) | 🔴 **Masih terbuka** | 1 *critical*; tidak ada perbaikan di jalur 14.x — keputusan: tunda upgrade |
| Dependensi (lainnya) | 🟢 Diperbaiki sebagian | 34 → 18 kerentanan lewat `npm audit fix` non-breaking |
| Skema database vs repositori | 🔴 **Masih terbuka** | Prod pernah diubah di luar migrasi |

---

## 2. Metodologi & Batasan

### 2.1 Probe live (dengan kunci `anon` publik)

Probe dilakukan **hanya** dengan `NEXT_PUBLIC_SUPABASE_ANON_KEY` — persis modal penyerang mana pun. Semua probe *read-only* atau gagal di tingkat constraint sehingga **tidak ada data tersimpan**.

```
GET  /rest/v1/profiles?select=id&limit=1
     -> 401 {"code":"42501","message":"permission denied for table profiles",
             "hint":"GRANT SELECT ON public.profiles TO anon;"}
GET  /rest/v1/{transactions,wallets,notifications,receipts}
     -> 401 permission denied for table                    ✅
POST /rest/v1/rpc/bills_shared_with_me
     -> 401 permission denied for function                 ✅
POST /rest/v1/rpc/execute_wallet_transfer (UUID acak, tanpa mutasi)
     -> 401 permission denied for function                 ✅
```

**Kesimpulan probe `anon`:** tidak ada GRANT tabel sama sekali, dan dua RPC yang diuji sudah di-REVOKE.

### 2.2 Probe `authenticated` — DIBATALKAN karena diblokir captcha

Probe tahap berikutnya (menguji kebijakan yang hanya berlaku untuk peran `authenticated`) membutuhkan satu sesi login. Upaya membuat akun test ditolak oleh proteksi bawaan Supabase Auth:

```json
{"code":400,"error_code":"captcha_failed",
 "msg":"captcha protection: request disallowed (no captcha_token found)"}
```

`signup`, `password grant`, dan *anonymous sign-in* semuanya ditolak. Token captcha hanya bisa dihasilkan widget di browser, sehingga **tidak dapat dibuat dari sisi skrip**.

**Sebagai gantinya:** semua pertanyaan yang ingin dijawab lewat probe tersebut kini dijawab oleh **`SECURITY_VERIFY.sql`** — satu blok `SELECT` yang Anda jalankan sendiri di Supabase SQL Editor dan hasilnya berupa satu tabel ringkasan. Skrip itu bersifat *read-only* dan **lebih definitif daripada probe**, karena membaca keadaan production secara langsung.

### 2.3 Koreksi atas kesimpulan awal audit

Dua kesimpulan awal audit ternyata salah dan sudah dibatalkan:

1. **`execute_wallet_transfer` dikira terbuka** → ternyata sudah di-REVOKE (terbukti dari probe `401 permission denied for function`). Temuan ini **stale**.
2. **Hasil probe tabel dikira menguji RLS** → ternyata ditolak lebih dulu di lapisan **GRANT**, jadi kebijakan `WITH CHECK (TRUE)` pada `notifications` **tidak pernah teruji** oleh probe tersebut. Penilaian atas kebijakan itu bersifat **analitis berbasis kode**, bukan bukti eksploitasi.

### 2.4 Batasan

1. Tidak ada akses ke dashboard Supabase/Vercel maupun kunci `service_role`, sehingga keadaan privilege *sebenarnya* di production tidak dapat dipastikan dari sini — itulah gunanya `SECURITY_VERIFY.sql`. Di mesin ini juga tidak terpasang Supabase CLI, `psql`, maupun token Supabase (`~/.supabase` hanya berisi `traces`/`telemetry.json`), sehingga langkah yang menyentuh database & Edge Function hanya bisa dijalankan dari SQL Editor / Dashboard oleh Anda. *(Per 09-10-2026 akses CLI sementara diperoleh dan seluruh langkah mendesak dieksekusi — hasilnya di §9.)*
2. **Skrip `tsc`/`next build` tidak dijalankan** (larangan aturan workspace). Seluruh perubahan kode diverifikasi lewat *parse-only syntax check* — **bukan** type-check. Jalankan build/test manual sebelum deploy.
3. Status production mungkin berbeda dari repositori karena pernah diubah langsung di SQL Editor (lihat 5.2).

---

## 3. Temuan yang Telah Diperbaiki

### 3.1 🔴 KRITIS — 4 Edge Function tanpa autentikasi, memegang `service_role`

**Lokasi:** `supabase/functions/{send-fcm-notification,send-reminder,process-recurring,budget-alert}/index.ts`

Keempatnya tidak memverifikasi pemanggil sama sekali, memakai `SUPABASE_SERVICE_ROLE_KEY` (melewati seluruh RLS), dan menyetel `Access-Control-Allow-Origin: '*'`.

| Fungsi | Dampak bila dipanggil pihak luar |
|---|---|
| `send-fcm-notification` | Menyisipkan notifikasi palsu ke akun mana pun + kirim push ke perangkat siapa pun → **vektor phishing in-app** |
| `process-recurring` | Memanggil RPC yang **membuat transaksi** → korupsi data bila dipicu berulang |
| `send-reminder` | Memicu pengiriman email massal → **email bombing + pemborosan kuota Resend** |
| `budget-alert` | Notifikasi ganda berulang |

**Perbaikan:** `supabase/functions/_shared/auth.ts` berisi:

* `requireCronSecret(req)` — membandingkan `x-cron-secret` / `Authorization: Bearer` terhadap `CRON_SECRET` secara **timing-safe** (hash SHA-256 lalu XOR), **gagal-tertutup** (`503`) bila `CRON_SECRET` belum di-set.
* `resolveCaller(req, supabase)` — mengenali pemanggil: `trusted` (cron) atau `user` (JWT valid).
* `canNotify(supabase, callerId, targetId)` — hanya target sendiri, mitra `last_bill_partners` (dua arah), atau partner satu tagihan patungan (dua arah).

Kemudian: 3 fungsi cron wajib `CRON_SECRET`; `send-fcm-notification` wajib JWT dan `fcm_token` mentah ditolak untuk pemanggil biasa; `Access-Control-Allow-Origin: '*'` **dihapus dari kelima fungsi**; `delete-user-account` hanya mengembalikan pesan generik.

**Verifikasi:** 29 unit test pada `safeEqual` / `requireCronSecret` / `resolveCaller` / `canNotify` — **semua lulus**, termasuk "JWT yang diselipkan tidak boleh cocok dengan `CRON_SECRET`" dan "secret belum di-set → 503".

> ### ⚠️ TINDAKAN MANUAL WAJIB
> ```powershell
> supabase secrets set CRON_SECRET=<nilai acak panjang>
> supabase db push
> ```
> Lalu buka **Supabase Dashboard → Edge Functions → Scheduled Functions** dan tambahkan header `x-cron-secret: $CRON_SECRET` pada `send-reminder`, `process-recurring`, dan `budget-alert`.
> **Tanpa ini, ketiga cron akan mengembalikan `503` dan jadwalnya berhenti diam-diam.**

---

### 3.2 🔴 TINGGI — Policy RLS `notifications` terbuka untuk semua peran

**Lokasi:** `.agents/002_rls.sql`

```sql
CREATE POLICY "notifications: service insert"
  ON notifications FOR INSERT WITH CHECK (TRUE);
```

Tanpa klausa `TO <peran>`, kebijakan ini berlaku untuk **semua** peran, termasuk `authenticated`. Komentarnya menyebut "service role", padahal `service_role` justru **melewati RLS sepenuhnya** — jadi klausa itu tidak pernah diperlukan untuk service role, hanya membuka pintu bagi pengguna biasa.

Akibatnya setiap akun login dapat memanggil langsung `POST /rest/v1/notifications` dengan `user_id` siapa pun, dan pesan itu muncul di dalam aplikasi korban — **tanpa melalui aplikasi Anda sama sekali.**

> **Catatan bukti:** temuan ini **belum teruji langsung** karena probe `authenticated` diblokir captcha (bagian 2.2). Penilaiannya berbasis pembacaan kode.

**Perbaikan** (migrasi `20261005100000_security_hardening.sql`):

* `notifications: insert own` → `TO authenticated WITH CHECK (user_id = auth.uid())`
* `notifications: insert related` → `TO authenticated`, hanya bila ada relasi nyata (`last_bill_partners` atau `split_bills`+`split_bill_shares`, dua arah)
* `notifications: service insert` → kini `TO service_role WITH CHECK (TRUE)`
* Menambah `notifications: delete own` (sebelumnya **tidak ada** kebijakan DELETE, sehingga `deleteNotification()` di aplikasi selalu no-op)

---

### 3.3 🔴 TINGGI — Server Action tanpa autentikasi (IDOR)

**Lokasi:** `src/actions/ai-budget.ts` → `syncAICacheWithBudgets(userId, updates)`

Fungsi ini **tidak pernah memanggil `supabase.auth.getUser()`** dan memakai `userId` dari klien untuk `SELECT` **dan** `UPDATE` baris `ai_insights`. Karena diekspor dari berkas `'use server'`, ia adalah endpoint yang bisa dipanggil siapa pun.

**Perbaikan:** parameter `userId` dihapus total; fungsi kini mengambil identitas dari sesi berjalan dan menambahkan `.eq('user_id', user.id)` sebagai pertahanan kedua. Dua lokasi pemanggil diperbarui.

---

### 3.4 🔴 TINGGI — Trigger `update_wallet_balance` bisa mengubah saldo orang lain

**Lokasi:** `.agents/001_init.sql`

```sql
UPDATE wallets SET balance = balance + NEW.amount ... WHERE id = NEW.wallet_id;
```

Fungsi ini `SECURITY DEFINER` (melewati RLS) dan **tidak memeriksa pemilik dompet**, sementara `wallet_id` diterima dari klien tanpa verifikasi di `addTransaction`, `updateTransaction`, `createSplitBill`, `markSharePaid`, dan `createRecurringTemplate`.

**Perbaikan:** seluruh `UPDATE` kini diberi `AND user_id = NEW.user_id`, plus `SET search_path = public, pg_temp`.

---

### 3.5 🔴 TINGGI — RPC internal dapat dipanggil langsung melewati Edge Function

**Lokasi:** `.agents/003_transfer_rpc.sql`, `.agents/004_recurring_rpc.sql`, `supabase/migrations/20260719082800_fix_rpc_fcm_returns.sql`

`check_budget_alerts()`, `process_due_recurring_templates()`, `process_due_reminders()` semuanya `SECURITY DEFINER` **tanpa `REVOKE` apa pun**. Postgres memberi `EXECUTE` ke `PUBLIC` secara bawaan, sehingga kunci `anon` dapat memanggilnya langsung di `/rest/v1/rpc/...` — **menembus perbaikan di 3.1**.

**Perbaikan:** blok `DO` dinamis yang `REVOKE ALL ... FROM PUBLIC, anon, authenticated` lalu `GRANT ... TO service_role` (dinamis agar tidak bergantung pada tanda tangan argumen).

> `execute_wallet_transfer` **terverifikasi aman lewat probe live** (401). Sebagai lapisan kedua, migrasi tetap menambahkan validasi `auth.uid()` di dalam fungsi serta mengganti `RETURN ... SQLERRM` (bocor teks error Postgres mentah) dengan pesan generik.

---

### 3.6 🟠 SEDANG — HTML injection pada email pengingat

`supabase/functions/send-reminder/index.ts` menyisipkan `reminder.title` dan `reminder.notes` (input pengguna) **mentah** ke body HTML email. Kini ada fungsi `esc()` untuk `title`, `notes`, `due_date`, dan `amountFormatted`. Field `diagnostics` yang membocorkan keberadaan secret juga dihapus.

---

### 3.7 🟠 SEDANG — Rate limit scan struk bisa dilewati + validasi MIME lemah

**Lokasi:** `src/app/api/ai/scan-receipt/route.ts`

**Tiga masalah, semuanya sudah diperbaiki:**

**(a) Kuota tidak menghitung percobaan gagal.** Kuota 20/hari dihitung dari baris `receipts` yang hanya tercipta *setelah* Gemini sukses. Gambar non-struk membuat Gemini tetap dipanggil lalu ditolak tanpa baris tersimpan → kuota tak pernah berkurang → biaya Gemini tanpa batas.

Kini kuota dihitung lewat RPC **`consume_scan_quota`** (migrasi) yang melakukan **satu `UPDATE` dengan klausa `WHERE`** — sehingga beberapa request bersamaan tidak bisa sama-sama lolos (menutup celah TOCTOU yang sebelumnya saya catat sebagai temuan terbuka). Pencatatan terjadi **sebelum** Gemini dipanggil. Bila RPC belum tersedia, kode mundur ke pembacaan-lalu-update agar fitur tetap berjalan.

**(b) Validasi MIME mempercayai klien.** `file.type` berasal dari header Content-Type yang bisa dipalsukan, dan `allowed_mime_types` pada bucket pun memvalidasi header yang sama — jadi keduanya bisa ditembus.

Kini ada **magic-byte sniffing** (`FF D8 FF`, `89 50 4E 47…`, `RIFF….WEBP`, `GIF8`, `%PDF`) yang menolak file isi-deklarasi-tidak-cocok **sebelum** upload dan sebelum kuota terpakai. Ekstensi nama file juga kini diturunkan dari hasil deteksi, bukan dari `file.name` (menutup potensi manipulasi kunci objek).

**(c) File gagal tidak dibersihkan.** Bila Gemini gagal setelah upload, berkas 5MB tertinggal. Kini `cleanupUpload()` dijalankan pada semua jalur kegagalan.

**(d) `getPublicUrl` pada bucket privat.** *Dikoreksi dari temuan awal:* kolom `image_url` ternyata **tidak pernah dibaca/dirender** oleh komponen mana pun — jadi ini bukan bug fungsional, melainkan dead code. Nilai yang disimpan kini berupa **path** agar kelak bisa ditandatangani (`createSignedUrl`).

**Juga diperbaiki:** `error.message` tidak lagi dikembalikan ke klien.

---

### 3.8 🟠 SEDANG — GDPR: file storage tidak ikut terhapus & ekspor tidak lengkap

`auth.admin.deleteUser()` menghapus `auth.users` dan baris terkait, **tetapi tidak menyentuh `storage.objects`** (tidak ada FK ke `profiles`) → gambar struk tetap bertahan (pelanggaran GDPR Pasal 17).

**Perbaikan:** `deleteStorageTree()` dijalankan sebelum `deleteUser`, dengan pagination `list()` (100/halaman); kegagalan dicatat tapi tidak membatalkan penghapusan akun.

`exportUserData()` sebelumnya hanya 9 tabel — kini bertambah `wallet_transfers`, `split_bills`, `last_bill_partners`, `ai_insights` (GDPR Pasal 20).

---

### 3.9 🟠 SEDANG — CAPTCHA Turnstile bisa mati diam-diam di production

```ts
const secretKey = process.env.TURNSTILE_SECRET_KEY || '1x00000000000000000000000000000000AA'
```

`1x00...AA` adalah **test secret "always-pass"** milik Cloudflare. Bila `TURNSTILE_SECRET_KEY` belum diset di Vercel, seluruh proteksi lulus semua tanpa error. Kini **gagal-tertutup** di production; fallback test secret hanya untuk non-production dengan peringatan.

---

### 3.10 🟠 SEDANG — Injeksi perintah saat build + header kurang

**(a)** `scripts/generate-updates.js` menjalankan `execSync(\`git merge-base --is-ancestor ${lastCommitHash} HEAD\`)` di mana `lastCommitHash` berasal dari `src/data/updates-auto.json` yang **ikut ter-commit**. Siapa pun yang bisa mengubah JSON itu (mis. lewat PR) mendapat eksekusi perintah saat `next build` — tersembunyi karena file-nya tampak seperti data. Kini divalidasi `^[0-9a-f]{7,64}$i`.

**(b)** Header ditambahkan: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (sebelumnya **tidak ada HSTS sama sekali**), `object-src 'none'`, dan `upgrade-insecure-requests` **hanya saat production** (di `next dev` http://localhost, direktif itu akan memaksa https dan merusak server lokal).

---

### 3.11 🟠 SEDANG — Kebocoran `error.message` ke klien (40 titik)

Di production, pesan error Supabase/Postgres/LLM bisa memuat nama tabel, nama policy RLS, nama constraint, atau detail konfigurasi provider — dan `return { error: ... }` mengirimnya apa adanya (berbeda dengan error *thrown* yang memang disamarkan Next.js).

**Dikerjakan:**

* **32 titik** diganti lewat codemod menjadi `safeErrorMessage(err, 'pesan generik')` — helper baru di `src/lib/safe-error.ts` yang **tetap mencatat error aslinya ke log server** lalu mengembalikan pesan generik. 17 di antaranya langsung dikembalikan ke string generik karena sudah punya `console.error` (agar log tidak dobel); 15 sisanya memakai helper karena sebelumnya **tidak mencatat log sama sekali**.
* **8 titik** yang tertinggal diperbaiki manual: `profile.ts` (3), `receipts.ts`, `gdpr.ts`, `reminders/snooze/route.ts`, dan **`auth/callback/route.ts`** — yang terakhir penting karena rute itu terbuka untuk publik tanpa login.

**Yang sengaja TIDAK diubah:** pesan `parsed.error.issues[0].message` / `errors.X.message` — itu string Zod & react-hook-form buatan sendiri yang memang untuk ditampilkan ke pengguna.

---

### 3.12 🟠 SEDANG — `addPartner` menerima `partner_user_id` sembarang

**Lokasi:** `src/actions/split-bills.ts` → `addPartner()`

`partner_user_id` diambil dari klien tanpa verifikasi, sehingga seseorang dapat mendaftarkan UUID siapa pun sebagai "teman" lalu memanfaatkan kebijakan `notifications: insert related` (3.2) untuk menyisipkan notifikasi.

**Perbaikan:** `partner_user_id` **hanya diterima bila `source === 'qr'`** (hasil pemindaian kode QR milik orang tersebut). Input manual kini selalu menyimpan `NULL`. Pemanggil di UI sudah konsisten: jalur QR mengirim `source: 'qr'`, jalur manual mengirim `source: 'manual'` tanpa `partner_user_id`.

---

### 3.13 🟡 RENDAH — `.gitignore` & dependensi

**`.gitignore`:** `.env*.local` diabaikan, tetapi `.env` dan `.env.production` **tidak**; `dev-server*.log` juga tidak masuk daftar. Keduanya ditambahkan.

**Hasil scan histori Git (179 commit):** ✅ **bersih** — tidak ada kunci nyata, tidak ada file `.env` yang pernah ter-commit.

**`npm audit fix` (tanpa `--force`): 34 → 18 kerentanan.**

```
sebelum: 3 low, 6 moderate, 24 high, 1 critical
sesudah: 18 (17 high, 1 critical)  — semuanya menuntut --force
```

Sisa 18 hanya bisa diselesaikan dengan upgrade semver-major (`next`, `firebase`, `tailwindcss`, `eslint-config-next`, `postcss`).

> ### ⚠️ PERIKSA SETELAH `npm audit fix`
> npm melaporkan:
> ```
> npm warn install-scripts 5 packages had install scripts blocked because they are not covered by allowScripts:
>   @google/genai, core-js, unrs-resolver, protobufjs, @firebase/util
> ```
> Ini perilaku npm yang lebih baru (memblokir skrip instalasi secara bawaan), bukan akibat dari advisory-nya sendiri — tetapi **satu-satunya cara memastikan tidak ada yang rusak adalah menjalankan `npm run dev` / `npm run lint` / `npm run build`**, yang tidak boleh saya jalankan. Mohon verifikasi di sisi Anda.

---

## 4. Hal yang Sudah Tervalidasi Baik

| Pemeriksaan | Hasil |
|---|---|
| Middleware memvalidasi sesi sungguhan | ✅ `supabase.auth.getUser()` — bukan sekadar baca cookie |
| Semua halaman terproteksi berada di bawah `/dashboard` | ✅ (hanya `/` dan `/auth/*` yang publik) |
| Kedua route API mengecek autentikasi | ✅ `scan-receipt`, `reminders/snooze` |
| `anon` tidak punya GRANT tabel | ✅ terverifikasi via probe live |
| `bills_shared_with_me` & `execute_wallet_transfer` sudah di-REVOKE | ✅ terverifikasi via probe live |
| Tidak ada `dangerouslySetInnerHTML` | ✅ 0 kemunculan di `src/` |
| Tidak ada `service_role` / `createAdminClient` di `src/` | ✅ hanya di `supabase/functions/` |
| `markSharePaid` memverifikasi pemilik share | ✅ |
| `delete-user-account` hanya menghapus pemanggil sendiri | ✅ |
| Secret hanya di server-side | ✅ `NEXT_PUBLIC_FIREBASE_*` memang publik by-design |
| 52 Server Action: autentikasi & kepemilikan | ✅ sudah `getUser()` + `.eq('user_id')` |

---

## 5. Masih Terbuka

### 5.1 🔴 `next@14.2.35` — 1 *critical*, 22 advisory, **tanpa perbaikan di jalur 14.x**

```
next   critical   range: 9.3.4-canary.0 – 16.3.0-preview.10
fixAvailable: { "name": "next", "version": "16.3.8", "isSemVerMajor": true }
```

`14.2.35` **adalah rilis 14.2.x terbaru** (`next-14` dist-tag) — tidak akan ada patch keamanan lagi untuk versi ini. Semua advisory menuntut **≥ 15.5.x**.

Advisory paling relevan untuk deployment ini:

| Advisory | Rentang perbaikan | Catatan |
|---|---|---|
| RCE di Image Optimization (AVIF) `GHSA-2xp9-vwfh-vxw4` | `<15.5.24` | Endpoint `/_next/image` tetap ada walau app tidak memakai `next/image` |
| RCE di Windows `GHSA-p293-qw3h-jr36` | `<15.5.24` | **Tidak berlaku** — Vercel berjalan di Linux |
| SSRF di Server Actions `GHSA-89xv-2m56-2m9x` | `<15.5.21` | Berlaku |
| DoS di Server Actions (App Router) `GHSA-m99w-x7hq-7vfj` | `<15.5.21` | Berlaku |
| Unauthenticated disclosure Server Function endpoints `GHSA-955p-x3mx-jcvp` | `<15.5.21` | Berlaku |
| Cache poisoning RSC `GHSA-wfc6-r584-vfw7` | `<15.5.16` | Berlaku |
| Middleware/Proxy redirect cache poisoning `GHSA-3g8h-86w9-wvmq` | `<15.5.16` | Berlaku |
| XSS via `beforeInteractive` `GHSA-gx5p-jg67-6x7h` | `<15.5.16` | Berlaku bila ada skrip `untrusted` |
| HTTP request smuggling di rewrites `GHSA-ggv3-7p47-pfv8` | `<15.5.13` | Berlau |
| Bypass middleware (Pages Router + i18n) `GHSA-36qx-fr4f-26g5` | `<15.5.16` | **Tidak berlaku** — ini App Router |

**Keputusan:** upgrade **tidak dikerjakan sekarang**. Alasannya: upgrade 14 → 15 adalah perubahan breaking (React 19, *async* request APIs, perubahan `next/image`), dan aturan workspace melarang saya menjalankan build — sehingga risiko merusak aplikasi **tanpa bisa saya deteksi** terlalu besar.

**Rencana saat ada jendela waktu:** naik ke `next@15.5.x` (jalur backport `15.5.27`, lebih rendah risikonya daripada lompat ke 16.x), jalankan `npm run build` dan uji regresi.

**Mitigasi sementara tanpa upgrade:**

* Tidak ada konfigurasi `images` sama sekali di `next.config.mjs` — pertimbangkan menonaktifkan optimizer bila memang tidak dipakai.
* `/_next/image` dilayani infrastruktur Vercel (Linux), bukan binari Next *self-hosted*, sehingga jalur RCE umumnya lebih terlindungi — tapi ini **bukan** pengganti upgrade.
* Pantau Vercel Security Bulletins untuk perubahan *platform-level*.

### 5.2 🔴 Skema database tidak dapat direproduksi dari repositori

Bukti di `proggress/supabase-optimizer` menunjukkan perubahan keamanan (rebuild `auth_uid()`, REVOKE, validasi `p_user_id != auth.uid()`, `security_invoker` pada view) diterapkan **langsung ke production**, bukan lewat file di `supabase/migrations/`.

Konsekuensi:

* Konfigurasi production **tidak bisa dibangun ulang** dari repositori — bencana = kehilangan seluruh hardening.
* `.agents/*.sql` dan `supabase/migrations/*` **berbeda** dari keadaan sebenarnya.
* Fungsi `process_due_reminders()` **tidak ada definisinya di repositori mana pun.**
* Tabel `ai_insights` **tidak punya DDL/RLS di repositori** → status RLS-nya **tidak dapat diverifikasi dari kode**.
* Dokumen `supabase-optimizer` menyebut tabel `recurring_transactions`, padahal skema memakai `recurring_templates` — indikasi dokumen tidak sepenuhnya cocok dengan kode.

**Tindakan:** jalankan **`SECURITY_VERIFY.sql`** (di root repo), kirimkan hasilnya, lalu seluruh perbedaan dimasukkan kembali ke file migrasi agar `supabase db push` menghasilkan keadaan yang sama.

### 5.3 🟠 CSP masih memuat `'unsafe-inline'` & `'unsafe-eval'`

```yaml
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com ...
```

Dengan `unsafe-eval`, nilai proteksi CSP terhadap XSS turun drastis. Perbaikan sejatinya adalah **nonce-based CSP** yang dihasilkan di middleware — tidak bisa dipastikan aman tanpa menjalankan build, jadi ini hanya direkomendasikan.

### 5.4 🟠 Lain-lain

| # | Temuan | Severity | Status |
|---|---|---|---|
| 1 | **`wallet_id`/`category_id` dari klien tidak diverifikasi kepemilikannya** (8 lokasi) | ~~Sedang~~ → **Rendah** | Diturunkan: setelah perbaikan trigger (3.4), menunjuk dompet/kategori milik orang lain **tidak lagi mengubah data korban sama sekali** — barisnya tetap milik pelaku (self-harm). Sisa risiko hanya integritas data milik sendiri. Menambah 8 pemeriksaan justru berisiko merusak alur sah (mis. kategori hasil saran AI) tanpa bisa saya uji lewat build. |
| 2 | **Race condition (TOCTOU) pada kuota scan** | ~~Sedang~~ → **Diperbaiki** | Diselesaikan lewat RPC `consume_scan_quota` (3.7). |
| 3 | **Validasi MIME mempercayai klien** | ~~Sedang~~ → **Diperbaiki** | Magic-byte sniffing (3.7). |
| 4 | **File gagal diproses tidak dibersihkan** | ~~Rendah~~ → **Diperbaiki** | `cleanupUpload()` (3.7). |
| 5 | **`getPublicUrl` pada bucket privat** | ~~Rendah~~ → **Dead code** | `image_url` tidak pernah dirender (3.7d). |
| 6 | **`verifyTurnstileToken` adalah proxy tak terautentikasi** ke `siteverify` — konsumsi kuota Cloudflare oleh pihak luar | Rendah | Terbuka. Jalankan saja bila kuota Cloudflare terasa terpakai. |
| 7 | **`reminders/snooze` tanpa rate limit** (satu-satunya route API selain scan-receipt) | Rendah | Terbuka — dampaknya hanya bisa berulang kali menunda pengingat sendiri. |
| 8 | **Tidak ada CI/CD security scanning** — tidak ada `.github/`, `vercel.json`, `supabase/config.toml`, sehingga flag deploy (terutama `verify_jwt` Edge Function) **tidak dapat direproduksi dari repositori** | Sedang | Terbuka |
| 9 | **Pembacaan data sepenuhnya mengandalkan RLS** di `getWallets` dan `generateAIBudgetPlan` (tanpa `.eq('user_id')`). Aman selama policy tetap ada. | Rendah | Terbuka |
| 10 | **Kebijakan `FOR ALL USING (…)` tanpa `WITH CHECK` eksplisit** — Postgres memakai `USING` sebagai gantinya (aman), tapi eksplisit lebih jelas. | Info | Terbuka |

---

## 6. Daftar Perubahan yang Dibuat

```
BARU  supabase/functions/_shared/auth.ts                      guard otorisasi + 29 unit test
BARU  supabase/migrations/20261005100000_security_hardening.sql  policy, REVOKE, trigger, search_path,
                                                                 kolom scan_*, RPC consume_scan_quota
BARU  src/lib/safe-error.ts                                   safeErrorMessage() — sanitasi + tetap log
BARU  SECURITY_VERIFY.sql                                     skrip verifikasi SQL (read-only)
BARU  SECURITY_CRON_SETUP.sql                                 skrip langkah 4: pasang header x-cron-secret
BARU  supabase/migrations/20261009120000_capture_drift_functions.sql  definisi process_due_reminders &
                                                                 update_user_streak, disalin dari production
BARU  supabase/functions/debug-fcm-env/index.ts              fungsi Dashboard-only -> direpo + dikeraskan
                                                             (guard CRON_SECRET, materi kunci dibuang)

      supabase/functions/send-fcm-notification/index.ts       JWT + canNotify, CORS dihapus
      supabase/functions/send-reminder/index.ts               CRON_SECRET + escape HTML
      supabase/functions/process-recurring/index.ts           CRON_SECRET
      supabase/functions/budget-alert/index.ts                CRON_SECRET
      supabase/functions/delete-user-account/index.ts         hapus file storage + pesan generik
      src/actions/ai-budget.ts                                hapus userId klien, wajib getUser()
      src/actions/budgets.ts                                  penyesuaian pemanggilan
      src/actions/split-bills.ts                              addPartner: partner_user_id hanya via QR
      src/actions/{profile,receipts,gdpr,...}.ts (16 file)     40 titik error.message disanitasi
      src/app/api/ai/scan-receipt/route.ts                    kuota atomik, magic bytes, cleanup, no leak
      src/app/api/reminders/snooze/route.ts                   pesan generik
      src/app/auth/callback/route.ts                          pesan generik (rute publik)
      src/actions/auth.ts                                     Turnstile gagal-tertutup di production
      next.config.mjs                                         HSTS, object-src, upgrade-insecure-requests
      scripts/generate-updates.js                             validasi hash anti-injeksi shell
      .gitignore                                              .env + *.log
      package-lock.json                                       npm audit fix: 34 -> 18
      SECURITY_AUDIT.md                                       laporan ini
```

Semua berkas lolos **parse-only syntax check**. Type-check dan build **belum** dijalankan (dilarang oleh aturan workspace).

---

## 7. Skrip Verifikasi

Buka **`SECURITY_VERIFY.sql`** (di root repo), tempel ke Supabase SQL Editor, Run.

* Seluruh isinya **hanya `SELECT`** — tidak ada yang mengubah data.
* Mengembalikan **satu tabel** dengan kolom `bagian / pemeriksaan / detail / status`.
* Cari baris berstatus **`KRITIS`** dan **`PERHATIAN`**.

Yang dijawab skrip itu:

1. Policy `notifications` — masih ada `WITH CHECK (TRUE)` untuk peran umum?
2. Policy lain dengan `WITH CHECK (true)` di seluruh `public`
3. Tabel **tanpa RLS** dan tanpa policy (ini yang menjawab "hanya 5 file migrasi vs banyak tabel")
4. GRANT tabel untuk `anon`
5. Privilege semua fungsi — apakah RPC cron masih bisa dipanggil `anon`/`authenticated`?
6. `search_path` statik + penanda `auth.uid()` & `user_id = NEW.user_id` pada fungsi DEFINER
7. `monthly_summary` sudah `security_invoker`?
8–9. **Drift**: fungsi DEFINER di DB yang tidak dikenal repositori
10. Tabel kunci (`ai_insights`, `split_bills`, …) ada/tidak + status RLS
11. Policy storage bucket `receipts`

Blok opsional (pg_cron, pg_net, ekstensi, bucket) ada di bagian bawah file dalam bentuk dikomentari.

Skrip **`SECURITY_CRON_SETUP.sql`** (berkas terpisah) adalah langkah 4 di §8 — skrip audit **satu-satunya yang menulis**. Jalankan hanya setelah Bagian A terbaca wajar dan Anda sudah menempelkan `v_secret`.

---

## 8. Urutan Tindakan Lanjutan

> **Status 09-10-2026:** langkah 1–6 di bawah **sudah dijalankan langsung ke production** beserta buktinya — lihat §9. Yang tersisa hanya langkah 7–10 dan pencabutan akses.

**Mendesak**
1. Jalankan `SECURITY_VERIFY.sql` → kirimkan hasilnya (tanpa ini, status hardening di production tidak diketahui)
2. `supabase secrets set CRON_SECRET=<nilai acak panjang>` — **catat nilainya**, dipakai lagi di langkah 4
3. `supabase db push` (migration `20261005100000`)
4. Jalankan **`SECURITY_CRON_SETUP.sql`** di SQL Editor: tempel `v_secret` = nilai `CRON_SECRET` dari langkah 2, lalu jalankan Bagian A → B → C. Ini memasang header `x-cron-secret` pada 3 job pg_cron (`send-reminder`, `process-recurring`, `budget-alert`) → **tanpa ini cron berhenti diam-diam**. Alternatif manual: Dashboard → Integrations → Cron → Edit job → tambah header.
5. **Deploy ulang Edge Functions** (`send-reminder`, `process-recurring`, `budget-alert`, `send-fcm-notification`, `delete-user-account`) — perubahan di `supabase/functions/` belum live sampai di-deploy. Urutannya: langkah 2 + 4 **sebelum** deploy, supaya fungsi baru tidak pernah menerima cron tanpa header.
6. Verifikasi build masih jalan setelah `npm audit fix`: `npm run lint` lalu `npm run dev` / `npm run build`
   (catatan: npm memblokir install script untuk `@google/genai`, `core-js`, `unrs-resolver`, `protobufjs`, `@firebase/util`)

**Penting**
7. Rencanakan upgrade `next` → 15.5.x saat ada jendela waktu untuk build & uji regresi (5.1)
8. Samakan isi database dengan file migrasi (5.2) — ini yang membuat semua perbaikan di atas bisa hilang lagi kalau database dibangun ulang

**Bersih-bersih**
9. Nonaktifkan atau lengkapi CSP nonce untuk menyingkirkan `unsafe-inline`/`unsafe-eval` (5.3)
10. Sisanya di tabel 5.4 sesuai prioritas

---

## 9. Hasil Eksekusi di Production (09-10-2026)

Seluruh langkah mendesak di §8 **sudah dijalankan langsung ke production** memakai Supabase CLI v2.120.0 + Personal Access Token. `supabase db query` berjalan lewat Management API, sehingga **password database tidak diperlukan** dan tidak pernah berpindah tangan.

### 9.1 Yang dieksekusi

| # | Langkah | Bukti |
|---|---|---|
| 2 | `secrets set CRON_SECRET` | `{"count":1,"message":"Finished supabase secrets set."}` |
| 4 | Sisipkan `x-cron-secret` ke 3 job pg_cron | ketiga job `header_terpasang = true`, jadwal tidak berubah (`0 * * * *`, `0 0 * * *`, `5 17 * * *`) |
| 5 | Migrasi `20261005100000` dijalankan | tanpa error; hasil verifikasi ulang nol KRITIS |
| 5 | Migrasi `20261009120000` (menangkap drift) | dua fungsi kini ada definisinya di repo |
| 6 | Deploy 5 Edge Function | `send-reminder`, `process-recurring`, `budget-alert`, `send-fcm-notification` dengan `--no-verify-jwt`; `delete-user-account` **tanpa** flag itu (tetap menuntut JWT) |
| — | Riwayat migrasi dicatat | 7 baris, dua migrasi baru tercatat dengan `created_by = audit-2026-10-09` |

### 9.2 Pengujian langsung ke endpoint produksi

| Uji | Hasil |
|---|---|
| `send-reminder` tanpa header | **401** `{"error":"Unauthorized"}` |
| `send-reminder` secret salah | **401** `{"error":"Unauthorized"}` |
| `send-reminder` secret benar | **200** `{"success":true,"processed":[]}` |
| `send-fcm-notification` tanpa JWT | **401** `{"error":"Missing authorization"}` |
| `delete-user-account` tanpa JWT | **401** `UNAUTHORIZED_NO_AUTH_HEADER` |

Jalur 200 pada `send-reminder` sekaligus membuktikan cron tidak akan 401/503 begitu fungsi baru aktif.

### 9.3 Hasil `SECURITY_VERIFY.sql` sebelum vs sesudah

| | Sebelum (05-10) | Sesudah (09-10) |
|---|---|---|
| KRITIS | 6 | **0** |
| PERHATIAN | 3 | **0** |
| OK / INFO | 80 | 77 + 12 = 89 baris |

Enam KRITIS yang tertutup: `categories` GRANT ke `anon`; `check_budget_alerts`, `process_due_recurring_templates`, `process_due_reminders` masih bisa dipanggil `anon`; `update_wallet_balance` tanpa ikatan pemilik; dan `notifications` policy.

### 9.4 Temuan baru: fungsi `debug-fcm-env` (sudah diselesaikan)

Fungsi **hanya ada di produksi**, tidak ada di repo, dibuat langsung dari Dashboard (`/tmp/.../source/index.ts`), status ACTIVE, `verify_jwt: false`, dan tanpa pemeriksaan apa pun di dalam kode. Dibaca isinya, ia membocorkan materi rahasia ke publik:

* 50 karakter pertama JSON `FIREBASE_SERVICE_ACCOUNT`
* 40 karakter pertama kunci privat (`private_key`)
* `client_email` dan `project_id`

Ini **information disclosure atas kredensial Firebase**; kunci privat tidak utuh, tetapi endpoint-nya adalah *credential oracle* gratis.

**Tindakan:** sumbernya diunduh lewat `supabase functions download` ke `supabase/functions/debug-fcm-env/index.ts`, lalu dikeraskan dan di-deploy ulang dari repo:

* guard `requireCronSecret` — kini menolak pemanggil tanpa `CRON_SECRET`
* potongan materi rahasia apa pun dibuang; yang tersisa hanya metadata (`found`, `length`, `parse_ok`, `project_id`, `client_email`, `has_private_key`, `private_key_pem_format`)
* `parseError` diganti pesan generik

Hasil uji langsung: tanpa header → **401**; dengan secret → **200** tanpa ada nilai kunci yang terkirim.

### 9.5 Koreksi atas laporan sebelumnya

1. **Temuan 3.2 (`notifications WITH CHECK (TRUE)`) tidak berlaku di production.** Keadaan sebenarnya: policy `notifications: service insert` sudah punya `WITH CHECK (user_id = auth.uid())`. Yang terbuka lebar adalah **baseline di repo** (`.agents/002_rls.sql`), bukan database. Jadi temuan itu nyata sebagai **risiko regresi** (migrasi apa pun yang dibangun ulang dari baseline akan membukanya lagi), bukan sebagai lubang yang sedang aktif. Migrasi `20261005100000` tetap diterapkan karena mengganti policy itu dengan varian `TO service_role` plus dua policy INSERT tambahan.
2. **§5.2 salah baca: riwayat migrasi produksi justru bersih.** `supabase_migrations.schema_migrations` berisi persis 5 migrasi yang ada di repo, lengkap dan berurutan. *Drift*-nya bukan migrasi yang bolong, melainkan **perubahan manual di SQL Editor** yang tidak pernah difilem — kini dua di antaranya (`process_due_reminders`, `update_user_streak`) sudah ditangkap ke `20261009120000_capture_drift_functions.sql`.
3. **Dua penilaian keparahan dikoreksi turun** oleh bukti produksi: `execute_wallet_transfer` (sudah REVOKE, terbukti dari probe 401) dan GRANT tabel (hanya `categories` yang terbuka, itupun terbatas baris default).

### 9.6 Bug pada skrip langkah 4 (sudah diperbaiki)

Saat dijalankan otomatis, penukaran teks massal pada `v_secret` ikut mengganti literal pembanding di penjaga placeholder — akibatnya penjaga berbalik menolak nilai yang justru benar. Penjaga kini memeriksa kata `GANTI` secara terpisah sehingga tahan terhadap penukaran massal.

### 9.7 Sisa tindakan

1. **Cabut Personal Access Token** yang dipakai sesi ini (https://supabase.com/dashboard/account/tokens) — sudah tidak diperlukan lagi.
2. **Verifikasi build lokal: `npm run lint` lalu `npm run build`** — belum pernah dijalankan, dan seluruh perubahan kode di §6 belum teruji type-check.
3. **Perbaikan di `src/` belum sampai ke pengguna.** Yang sudah hidup di production hanya lapisan database + Edge Function; perbaikan Next.js (IDOR `syncAICacheWithBudgets`, sanitasi `error.message`, kuota scan atomik, hardening CSP) baru berlaku setelah repo di-push ke Vercel. **Jangan push sebelum langkah 2 lolos.**
4. Pantau cron berikutnya lewat `net._http_response` (disimpan 6 jam): `status_code` harus 200, bukan 401/503.
5. Sisanya di §8 butuh akses Vercel/CSP (langkah 7, 9, 10).
