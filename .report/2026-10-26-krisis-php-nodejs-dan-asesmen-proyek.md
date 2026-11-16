# Laporan: Krisis Keamanan PHP & Node.js (Oktober 2026) dan Asesmen Dampak ke Proyek `finance_memo`

**Tanggal laporan:** 26 Oktober 2026
**Lingkup:** riset advisory resmi PHP dan Node.js per 21–23 Oktober 2026, asesmen dampak terhadap basis kode `finance_memo`, dan audit dependensi npm.
**Metode:** baca sumber primer (php.net, nodejs.org), inspeksi basis kode (read-only: glob, grep, pembacaan konfigurasi), `node --version`, dan `npm audit --json`.
**Berkas terkait:** `SECURITY_AUDIT.md` (audit keamanan 5 Oktober 2026).

---

## 1. Ringkasan Eksekutif

Dua rilis keamanan **kritis** diterbitkan pada hari yang sama, **Rabu 21 Oktober 2026**:

- **PHP** merilis advisory **"Critical remote code execution vulnerabilities, update now"** untuk **2 CVE dengan CVSS v4.0 9.2** yang memungkinkan **RCE tanpa autentikasi**.
- **Node.js** merilis **security release** untuk lini 26.x, 24.x, dan 22.x dengan **10 CVE** (severity tertinggi **HIGH**), termasuk **RCE via Brotli decoder**.

| Area | Status | Kesimpulan |
|---|---|---|
| **Krisis PHP** | 🟢 **Tidak terdampak** | Tidak ada satu pun file PHP, `composer.json`, maupun runtime PHP di proyek ini. Backend = Supabase (Postgres + Edge Function Deno). |
| **Krisis Node.js** | 🔴 **Terdampak** | Runtime lokal **Node v24.21.0** berada di bawah versi aman **v24.22.1** (rilis Jun & Jul 2026 sudah termasuk — hanya rilis 21 Okt yang belum); tidak ada pin versi Node (`engines`, `.nvmrc`, Dockerfile, CI). |
| **Dependensi npm** | 🔴 **12 kerentanan** *(awal 23, 11 diperbaiki)* | Sisa: 1 *critical* (`next@14.2.35`), 8 *high*, 3 *moderate* — seluruhnya menuntut upgrade mayor. |
| **Deploy (Vercel)** | 🟠 **Perlu verifikasi manual** | Versi runtime Node di dashboard Vercel tidak dapat dibaca dari repositori. |

**Prioritas tindakan:** (1) upgrade Node lokal ke **v24.22.1**, (2) verifikasi/pilih versi Node runtime di Vercel ≥ 24.22.1, (3) ✅ pin versi Node di repositori *(sudah dilakukan)*, (4) ✅ jalankan `npm audit fix` non-breaking *(sudah dilakukan, 23 → 12)*.

---

## 2. Bagian A — Krisis PHP (21 Oktober 2026)

### A.1 Kronik

| Tanggal | Peristiwa |
|---|---|
| 20 Okt 2026 | Pengumuman prarilis: *"Upcoming Critical PHP Security Release"*, dijadwalkan 21 Oktober 2026 pukul 14:00 UTC, **dua kerentanan kritis dengan CVSS v4.0 9.2**. |
| 21 Okt 2026 | Rilis keamanan **PHP 8.5.12, 8.4.27, 8.3.36, 8.2.35** + advisory *"Critical remote code execution vulnerabilities, update now"*. |
| 21 Okt 2026 | Rilis **PHP 8.6.0 RC4** — sudah memuat perbaikan untuk kedua CVE (larangan dipakai di produksi). |
| 23 Okt 2026 | Advisory informasional lanjutan: **"Session upload progress"** — mitigasi `session.upload_progress.enabled=0` hingga rilis bugfix berikutnya (CVE-2026-115560, penuh menyusul). |

### A.2 Dua Kerentanan Kritis

| CVE | Advisory | Judul | Skor |
|---|---|---|---|
| **CVE-2026-109618** | [GHSA-w8hw-w9fx-j79w](https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w) | **RCE via korupsi penanganan OOM** — penanganan *out-of-memory* dapat menginterupsi PHP saat data request internal masih setengah terinisialisasi; pembersihan request bisa memperlakukan data tidak valid sebagai valid. | **9.2** |
| **CVE-2026-109619** | [GHSA-6wmf-4rv5-p3rp](https://github.com/php/php-src/security/advisories/GHSA-6wmf-4rv5-p3rp) | **RCE via stale global state** — state internal milik request dapat bertahan setelah memori penyangganya dibebaskan; request berikutnya pada worker yang sama bisa memakai state usang tersebut sebelum inisialisasi normal meresetnya. | **9.2** |

### A.3 Versi Terdampak dan Versi Aman

| Lini | Versi aman (21 Okt 2026) | Catatan |
|---|---|---|
| PHP 8.5 | **8.5.12** | Rilis utama. |
| PHP 8.4 | **8.4.27** | Rilis utama. |
| PHP 8.3 | **8.3.36** | Rilis utama. |
| PHP 8.2 | **8.2.35** | ⚠️ **EOL 31 Desember 2026** — tidak ada perbaikan keamanan setelah tanggal itu. |
| PHP 8.1 & lebih lama | — | **Tidak lagi menerima update dari proyek PHP.** Backport minimal disediakan untuk 7.4 / 8.0 / 8.1: [`PHP-7.4-CVE-2026-109618-109619`](https://github.com/php/php-src/tree/PHP-7.4-CVE-2026-109618-109619), [`PHP-8.0-...`](https://github.com/php/php-src/tree/PHP-8.0-CVE-2026-109618-109619), [`PHP-8.1-...`](https://github.com/php/php-src/tree/PHP-8.1-CVE-2026-109618-109619). |

### A.4 Siapa yang Berisiko

> "Who is at risk: all PHP installations serving web requests, including PHP-FPM, Apache with mod_php, php-cgi, FrankenPHP and LiteSpeed. We consider the risk highest for **mod_php**, with a demonstrated exploit where an unauthenticated request can trigger the attack **before any application code runs**."

### A.5 Mitigasi Darurat (bila belum bisa update)

PHP menegaskan: **tidak ada mitigasi lengkap — update adalah satu-satunya solusi aman.** Yang berikut hanya mengurangi paparan:

**CVE-2026-109618 (OOM):**
- Set `memory_limit=-1` sebisa mungkin aplikasi tidak bisa menimpanya (mis. `php_admin_value` di pool FPM/Apache), dan pastikan tidak ada yang menaruh limit finit kembali.
- Set `post_max_size` rendah: `8M` bila tanpa upload, `32M` bila perlu upload; `upload_max_filesize` < `post_max_size`; batasi juga di web server/proxy (ukuran body, jumlah field, bagian multipart, header, kedalaman nesting) — termasuk request tanpa `Content-Length` yang valid.
- Gunakan limit container/cgroup sebagai batas ketersediaan (bukan `RLIMIT_AS`/`RLIMIT_DATA`, yang justru dapat memicu jalur rentan).

**CVE-2026-109619 (stale state):**
- Set `session.upload_progress.enabled=0` lalu **restart setiap worker**; atur via `php.ini`/pool FPM/server (bukan `ini_set()` atau `.user.ini`).
- Di PHP 8.5, set `fatal_error_backtraces=0` lalu restart setiap worker.
- Hapus setting per-request yang tidak valid/kedaluwarsa yang memunculkan diagnostik sebelum inisialisasi — `error_reporting`, `display_errors`, dan `@` **tidak membantu**.
- Perbaiki fatal error yang dapat dicapai penyerang dan timeout eksekusi.

### A.6 Advisory Lanjutan 23 Oktober 2026

- **Judul:** *Informational advisory: Session upload progress*.
- **Isi:** sarankan `session.upload_progress.enabled=0` hingga rilis bugfix reguler berikutnya untuk perlindungan penuh dari vektor RCE yang tidak lazim ini.
- **Prasyarat exploitasi (sangat tidak lazim):** konfigurasi memakai `session.serialize_handler` = `php_binary`/`php_serialize`, lalu **diubah ke `php` saat runtime via `ini_set()` sebelum `session_start()`**, dan upload progress masih aktif.
- **Implikasi:** aplikasi yang tidak pernah mengganti serialize handler saat runtime aman dengan fitur tetap menyala; CVE penuh **CVE-2026-115560** terbit bersama rilis berikutnya.
- Jika mitigasi sudah diterapkan pada 21 Okt: **pertahankan, tidak perlu aksi tambahan.**

---

## 3. Bagian B — Krisis Node.js (21 Oktober 2026)

**Sumber:** [Wednesday, October 21, 2026 Security Releases](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)
**Rilis keamanan:** **v26.12.1**, **v24.22.1** (Latest LTS), **v22.23.4** — severity tertinggi: **HIGH** untuk lini 26.x, 24.x, dan 22.x.

### B.1 Sepuluh Kerentanan yang Diperbaiki

| # | CVE | Severity | Ringkasan | Lini terdampak |
|---|---|---|---|---|
| 1 | **CVE-2026-111497** | 🔴 **HIGH** | **RCE via Brotli decoder** — *out-of-bounds write* pada buffer internal 8 byte ketika input terkompresi rusak; penyerang yang bisa menyuplai data Brotli yang didekompresi aplikasi lewat `node:zlib` dapat mengkorupsi memori proses → crash, kebocoran memori, atau **remote code execution**. | 26.x, 24.x, 22.x |
| 2 | **CVE-2026-105482** | 🔴 HIGH | `dns.resolve*()` dan `dns.reverse()` memotong hostname yang mengandung NUL secara diam-diam (perbaikan tidak lengkap dari CVE-2026-48930) — bypass validasi allowlist domain. | 26.x, 24.x, 22.x |
| 3 | **CVE-2026-105483** | 🔴 HIGH | Bypass verifikasi hostname TLS: IP ditulis dengan digit *fullwidth* (`１２７.0.0.1`) tidak dikenali sebagai IP → sertifikat `DNS:127.0.0.1` diterima untuk endpoint IP yang salah. | 26.x, 24.x |
| 4 | **CVE-2026-106069** | 🔴 HIGH | Bypass verifikasi hostname TLS pada host IPv4 non-kanonikal berawalan nol (`0127.0.0.1`) — URL WHATWG membaca oktet sebagai oktal, resolver OS sebagai desimal. | 26.x, 24.x, 22.x |
| 5 | **CVE-2026-105481** | 🟠 MEDIUM | HTTP Agent *keep-alive* bisa menerima response yang dikirim **sebelum** request dikirim (perbaikan tidak lengkap CVE-2026-48931) → kebingungan response. | 26.x, 24.x, 22.x |
| 6 | **CVE-2026-106072** | 🟠 MEDIUM | Sertifikat DNS SAN saja dapat mengautentikasi endpoint IP saat klien memakai ejaan IPv4 non-kanonikal (`0177.0.0.1`, `0x7f.0.0.1`, `2130706433`, `127.1`). | 26.x, 24.x, 22.x |
| 7 | **CVE-2026-106074** | 🟠 MEDIUM | Cache entropi `crypto.randomUUID()`/`randomInt()` ikut tersimpan di *startup snapshot*/*SEA* → setiap proses mengulang nilai yang sama (hingga 127 UUID / ±1.000 `randomInt()`). | 26.x, 24.x, 22.x |
| 8 | **CVE-2026-106070** | 🟡 LOW | `zlib.ZipFile` mengembalikan byte kendali penyerang setelah validasi header ZIP gagal — pemindai bisa menyetujui konten berbeda dari yang diekstrak implementasi lain. | 26.x |
| 9 | **CVE-2026-106071** | 🟡 LOW | Permission Model *filesystem* terlalu luas pada lookup wildcard radix (`--allow-fs-read=/etc/passwd.*` mengizinkan `/etc/passwd`). | 26.x |
| 10 | **CVE-2026-106073** | 🟡 LOW | Bypass Permission Model: `fs.realpathSync()` tanpa pemeriksaan izin baca (perbaikan tidak lengkap CVE-2026-21715). | 26.x, 24.x, 22.x |

### B.2 Update Dependensi Runtime dalam Rilis Ini

| Komponen | Lini yang diperbarui | Catatan |
|---|---|---|
| **c-ares** | 26.x, 24.x, 22.x | Terkait jalur resolusi DNS. |
| **ca-cert (eMudhra Intermediate CA Compromise)** | 26.x, 24.x, 22.x | Kompromi *intermediate CA* — *trust store* perlu pembaruan. |
| **OpenSSL** | 24.x, 22.x | |
| **SQLite** | 22.x | |
| **Undici** | 26.x, 24.x, 22.x | |

> Catatan resmi: *"End-of-Life versions are always affected when a security release occurs."*

### B.3 Konteks: Apakah Versi Lokal Juga Kena Rilis Sebelumnya?

Untuk memastikan cakupan paparan runtime lokal (**v24.21.0**), dua security release terdahulu pada lini 24.x dicek:

| Rilis keamanan | Versi aman 24.x | Status di v24.21.0 |
|---|---|---|
| 18 Juni 2026 (12 CVE: WebCrypto AES DoS, TLS wildcard bypass, NUL hostname, HTTP/2 ORIGIN frames, `http.Agent` queue poisoning, dsb.) | **24.17.0** | ✅ **Sudah termasuk** |
| 29 Juli 2026 (11 CVE: HTTP/2 `maxSessionMemory`, HTTP/2 heap-UAF, Permission Model, `zlib` TypedArray crash, dsb.) | **24.18.1** | ✅ **Sudah termasuk** |
| **21 Oktober 2026** (10 CVE — Bagian B.1) | **24.22.1** | 🔴 **Belum termasuk** |

**Kesimpulan:** tidak ada security release Node.js antara 29 Juli dan 21 Oktober 2026, sehingga **satu-satunya celah runtime lokal adalah rilis 21 Oktober 2026** — upgrade ke **v24.22.1** menutup seluruhnya.

> Catatan tambahan: tiga advisory 21 Okt disebut sebagai *"incomplete fix"* / *"regression"* dari advisory Juni 2026 (CVE-2026-48930, CVE-2026-48931, CVE-2026-48618). Artinya patch Juni **sudah ada** di v24.21.0, tapi belum cukup — wajib naik ke 24.22.1.

---

## 4. Bagian C — Metodologi Asesmen Proyek

Semua pemeriksaan berikut **read-only**:

| # | Pemeriksaan | Alat | Hasil |
|---|---|---|---|
| 1 | Cari file PHP (`**/*.php`) | glob | **0 file** |
| 2 | Cari `composer.json` / `composer.lock` | glob | **0 file** |
| 3 | Cari `Dockerfile*`, `docker-compose*`, `.nvmrc`, `*.yml`, `*.yaml`, `requirements.txt` | glob | **0 file** |
| 4 | Baca `package.json` | read | Next.js 14.2.35, React 18, **tanpa field `engines`** |
| 5 | Baca `next.config.mjs` | read | CSP/HSTS aktif, tidak ada konfigurasi runtime Node |
| 6 | Grep pemakaian API berisiko (`brotli\|zlib\|gunzip\|inflate\|dns.resolve\|checkServerIdentity\|createSecureServer\|https.request\|node:zlib\|node:dns`) di `*.ts,*.tsx,*.js,*.mjs,*.cjs` | grep | **0 kecocokan** |
| 7 | `node --version` | shell | **v24.21.0** |
| 8 | `npm audit --json` | shell | **23 kerentanan** (3 critical / 15 high / 5 moderate) dari 861 dependensi (540 prod, 302 dev) — kondisi awal; setelah remediasi tersisa 12 (lihat §9) |
| 9 | Struktur root & konteks deploy | read | Tidak ada `.github/`, tidak ada `vercel.json`; deploy **Vercel** (per `SECURITY_AUDIT.md` & `README.md`) |
| 10 | Cek security release Node.js **sebelumnya** (Juni & Juli 2026) terhadap versi lokal | webfetch nodejs.org | 24.x aman via **24.17.0** (18 Jun) dan **24.18.1** (29 Jul) → keduanya **sudah termasuk** di v24.21.0 |
| 11 | Grep pemakaian `next/image` / `<Image` / konfigurasi `images` | grep | **Tidak dipakai** — hanya `<img>` biasa di `ReceiptScanner.tsx` & `HelpGuidance.tsx` |
| 12 | Baca `src/middleware.ts` | read | Middleware aktif: `NextResponse.redirect()` untuk guard `/dashboard` & `/auth` |

> ⚠️ **Catatan lingkungan Windows:** `npm` via `npm.ps1` **diblokir kebijakan eksekusi PowerShell** (`UnauthorizedAccess`). Gunakan **`npm.cmd`** (mis. `npm.cmd audit`) untuk seluruh perintah npm di shell ini.

---

## 5. Bagian D — Analisis Dampak

### D.1 Krisis PHP → 🟢 TIDAK TERDAMPAK

- Tidak ada kode, konfigurasi, maupun runtime PHP di proyek: tidak ada `*.php`, `composer.json`, `composer.lock`, maupun kontainer berbasis PHP.
- Backend adalah **Supabase** (Postgres + Edge Function berjalan di **Deno**, bukan Node.js maupun PHP) dan **Firebase/FCM**.
- **Kesimpulan:** tidak ada tindakan apa pun yang perlu diambil untuk krisis PHP. Advisory ini tetap dicatat sebagai konteks jika suatu saat ada layanan pendukung berbasis PHP di luar repositori ini.

### D.2 Krisis Node.js → 🔴 TERDAMPAK

| Fakta | Implikasi |
|---|---|
| Runtime lokal **Node v24.21.0**; versi aman **v24.22.1** | 🔴 Semua CVE lini 24.x berlaku pada mesin development/build ini, termasuk **RCE Brotli (CVE-2026-111497)**. |
| **Tidak ada** field `engines`, `.nvmrc`, Dockerfile, atau konfigurasi CI | 🔴 Tidak ada penguncian versi → mudah terjadi *runtime drift* antar mesin dan build. |
| Deploy di **Vercel**, versi runtime tidak terbaca dari repositori | 🟠 Perlu verifikasi manual di Project Settings → Node.js Version (harus ≥ 24.22.1 / 22.23.4 / 26.12.1). Vercel umumnya mem-*patch* runtime dalam hitungan hari, tapi **tidak boleh diasumsikan**. |
| Grep API berisiko → 0 kecocokan | 🟢 Penyerang tidak punya jalur eksploitasi langsung dari kode aplikasi (tidak ada `dns.resolve*`, `tls.checkServerIdentity`, decompress Brotli manual). |
| Next.js menggunakan `zlib` (kompresi response) dan `undici` (fetch) internal | 🟠 Paparan **tidak langsung** tetap ada; rilis Node 21 Okt juga memperbarui **Undici**, menegaskan keterkaitan tersebut. |
| Fungsi berisiko CVE lain: `crypto.randomUUID()` di snapshot, Permission Model, `zlib.ZipFile` | 🟢 Tidak relevan: proyek tidak memakai *startup snapshot*/SEA, `--permission`, maupun `ZipFile`. |
| **Security release sebelumnya (Jun & Jul 2026)** — versi aman 24.17.0 & 24.18.1 | 🟢 **Sudah termasuk** di v24.21.0 → satu-satunya celah adalah rilis **21 Okt 2026** (lihat Bagian B.3). |
| **`next/image` tidak dipakai** (hanya `<img>` biasa) | 🟢 Advisory RCE Image Optimization API (AVIF/SVG) tak dapat dicapai lewat kode aplikasi; di Vercel, `/_next/image` juga dilayani infrastruktur Vercel. |
| **`src/middleware.ts` aktif** dan melakukan `NextResponse.redirect()` | 🟠 Advisory *"Middleware / Proxy redirects can be cache-poisoned"* ([GHSA-3g8h-86w9-wvmq](https://github.com/advisories/GHSA-3g8h-86w9-wvmq)) **relevan** pada jalur upgrade `next`. |
| Serverless model Vercel | 🟠 Sebagian mitigasi struktural (proses pendek, isolasi), tapi **bukan pengganti patch runtime**. |

**Tingkat risiko Node.js di proyek ini: SEDANG** — karena sisi aplikasi tidak mengekspos jalur eksploit langsung, tetapi runtime dev/build berada pada versi terdampak dan versi produksi tidak terkunci.

### D.3 Dependensi npm → 🔴 TERDAMPAK

Rincian di Bagian E. Yang paling berpengaruh: **`next@14.2.35`** dengan **25 advisory** (3 di antaranya *critical*, seluruhnya RCE) — sudah terdokumentasi di `SECURITY_AUDIT.md` §5.1 dengan keputusan *tunda upgrade*.

---

## 6. Bagian E — Audit Dependensi npm (26 Oktober 2026)

**Ringkasan:** total **23 kerentanan** saat pemeriksaan awal — **3 critical**, **15 high**, **5 moderate** (dari 861 dependensi: 540 produksi, 302 dev). Setelah `npm audit fix` non-breaking pada 26 Okt 2026 tersisa **12** (1 critical / 8 high / 3 moderate) — lihat §9.

Tabel di bawah adalah **kondisi sebelum perbaikan** (23 kerentanan):

### E.1 CRITICAL (3)

| Paket | Langsung? | Ringkasan advisory | Perbaikan |
|---|---|---|---|
| **`next`** `14.2.35` | ✅ Ya (dep) | **25 advisory**; 3 berseverity *critical*: [GHSA-p293-qw3h-jr36](https://github.com/advisories/GHSA-p293-qw3h-jr36) RCE tanpa autentikasi di server Windows (`>=13.4.0 <15.5.24`); [GHSA-2xp9-vwfh-vxw4](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4) RCE di Image Optimization API via AVIF (`>=10.0.0 <15.5.24`); [GHSA-2464-fhr4-w9xw](https://github.com/advisories/GHSA-2464-fhr4-w9xw) RCE di Image Optimization API via SVG (`>=10.0.0 <=15.5.27`). Sisanya: DoS Server Components, cache poisoning, XSS CSP nonce, request smuggling, SSRF, dsb. | ⚠️ Hanya `next@16.4.3` (upgrade mayor; range audit `9.3.4-canary.0 – 16.3.0-preview.10`) |
| **`dompurify`** `<=3.4.16` | ❌ Transitive | [GHSA-cg2g-xh64-v4q7](https://github.com/advisories/GHSA-cg2g-xh64-v4q7) bypass SAFE_FOR_TEMPLATES; [GHSA-mrv2-3pqr-j5jr](https://github.com/advisories/GHSA-mrv2-3pqr-j5jr) hook IN_PLACE tetap aktif pada subtree terpisah; [GHSA-c6gr-qvv4-5v3f](https://github.com/advisories/GHSA-c6gr-qvv4-5v3f) guard SMIL dilewati pada `application/xhtml+xml` | ✅ `fixAvailable: true` (non-breaking) |
| **`proxy-addr`** `1.1.0 – 2.0.7` | ❌ Transitive | [GHSA-jqcg-44mw-7w3h](https://github.com/advisories/GHSA-jqcg-44mw-7w3h) IP spoofing via subnet *trust* IPv4-mapped IPv6 | ✅ `fixAvailable: true` (non-breaking) |

> Catatan: advisory RCE Windows (`GHSA-p293-qw3h-jr36`) **tidak berlaku** untuk deployment Vercel (Linux). Advisory Image Optimizer (AVIF/SVG) lebih relevan untuk hosting *self-hosted*; proyek ini **tidak memakai `next/image`** (hanya `<img>` biasa) dan di Vercel `/_next/image` dilayani infrastruktur Vercel — sesuai analisis `SECURITY_AUDIT.md` §5.1, **bukan** pengganti upgrade. Advisory middleware *cache-poisoning* justru **relevan** karena `src/middleware.ts` aktif melakukan redirect.

### E.2 HIGH (15)

| Paket | Langsung? | Advisory utama | Perbaikan |
|---|---|---|---|
| `firebase` | ✅ Ya (dep) | Ketidakamanan transitive lewat `@firebase/firestore` | ⚠️ `firebase@9.14.0` (mayor — analisis manual) |
| `@firebase/firestore`, `@firebase/firestore-compat` | ❌ | Mewarisi dari `@grpc/grpc-js` | ⚠️ sama |
| `@grpc/grpc-js` `<=1.13.5` | ❌ | [GHSA-m9gg-hp2v-232j](https://github.com/advisories/GHSA-m9gg-hp2v-232j) `getAuthContext` bisa menganggap sertifikat tak terautorisasi sebagai sah (CVSS 7.4); [GHSA-f596-whhp-79r4](https://github.com/advisories/GHSA-f596-whhp-79r4) kebocoran pesan error ke klien | ⚠️ sama |
| `undici` `7.0.0 – 7.30.0` | ❌ | [GHSA-4qv8-2p9j-2685](https://github.com/advisories/GHSA-4qv8-2p9j-2685) DoS EventSource; [GHSA-f72v-6w45-q472](https://github.com/advisories/GHSA-f72v-6w45-q472) bypass SRI; [GHSA-xjj6-f33q-929c](https://github.com/advisories/GHSA-xjj6-f33q-929c) DoS via *content-encoding* berlebih | ✅ non-breaking |
| `zod` `<4.6.6` | ✅ Ya (dep) | [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) kehabisan memori validasi koleksi berukuran besar (CVSS 7.5) | ✅ non-breaking |
| `body-parser` `2.0.0 – 2.3.0` | ❌ | [GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828) DoS *trailing bytes* setelah body terkompresi | ✅ non-breaking |
| `postcss` `<=8.5.22` | ❌ | XSS via `</style>` tak-escape; pembacaan file sembarang via `sourceMappingURL` (3 advisory) | ⚠️ via `next` |
| `source-map-js` `1.0.0 – 1.2.1` | ❌ | [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) DoS *event-loop* | ✅ non-breaking |
| `glob` `10.2.0 – 10.4.5` | ❌ | [GHSA-5j98-mcp5-4vw2](https://github.com/advisories/GHSA-5j98-mcp5-4vw2) injeksi perintah CLI via `-c/--cmd` | ⚠️ via `eslint-config-next` |
| `@modelcontextprotocol/sdk` `<=1.31.0` | ❌ | 5 advisory (termasuk [GHSA-22jm-h49p-29qw](https://github.com/advisories/GHSA-22jm-h49p-29qw) CVSS 8.6, sesi tak terikat) | ✅ non-breaking |
| `@next/eslint-plugin-next`, `eslint-config-next` `14.x` | ⚠️ Ya (dev) | Mewarisi `glob` | ⚠️ `eslint-config-next@16.4.3` (mayor) |
| `shadcn` `<=4.21.5` | ✅ Ya (dep) | Mewarisi `@shadcn/registry` | ✅ non-breaking |
| `@shadcn/registry` | ❌ | Mewarisi `@modelcontextprotocol/sdk` | ✅ non-breaking |

### E.3 MODERATE (5)

| Paket | Advisory utama | Perbaikan |
|---|---|---|
| `fast-uri` | [GHSA-w74x-v6f9-j3xg](https://github.com/advisories/GHSA-w74x-v6f9-j3xg) *scheme spoofing* via percent-encoding; [GHSA-wjr9-j795-jxcr](https://github.com/advisories/GHSA-wjr9-j795-jxcr) kebingungan host | ✅ non-breaking |
| `ip-address` | [GHSA-rxp7-6hxx-x8q5](https://github.com/advisories/GHSA-rxp7-6hxx-x8q5) *quadratic time* pada `Address6` zone identifier → stall proses | ✅ non-breaking |
| `postcss-selector-parser` | [GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) kompleksitas kuadratik → kelelahan CPU | ⚠️ via `tailwindcss` |
| `postcss-nested` | Mewarisi `postcss-selector-parser` | ⚠️ via `tailwindcss` |
| `tailwindcss` (dep langsung) | — | ⚠️ `tailwindcss@4.3.3` (mayor) |

---

## 7. Bagian F — Rekomendasi Prioritas

### 🔴 P0 — Segera (hari ini)

1. **Upgrade Node.js lokal ke v24.22.1** (atau 22.23.4 bila memakai lini 22).
   - Windows: unduh installer dari <https://nodejs.org/en/download>, atau bila memakai nvm: `nvm-windows install 24.22.1`.
   - Verifikasi: `node --version` harus menampilkan **v24.22.1**.
   - ✅ **Status 26 Okt 2026:** instalasi portable v24.22.1 sudah terpasang & terverifikasi (checksum resmi), tapi **belum menjadi `node` default** — menunggu satu langkah admin (lihat §9, baris 9).
2. **Verifikasi versi runtime Node di Vercel** — Project Settings → General → Node.js Version. Pilih minimal **24.x terbaru (≥24.22.1)**, **22.x (≥22.23.4)**, atau **26.x (≥26.12.1)**; redeploy setelah mengubahnya.
3. **Catatan khusus PHP (hanya bila ada infrastruktur luar repositori):** update ke **8.5.12 / 8.4.27 / 8.3.36 / 8.2.35** atau terapkan mitigasi Bagian A.5 — **tidak berlaku untuk proyek ini**.

### 🟠 P1 — Minggu ini

4. ✅ **DILAKUKAN (26 Okt 2026)** — **Pin versi Node di repositori** agar tidak ada *runtime drift*:
   ```jsonc
   // package.json
   "engines": { "node": ">=24.22.1 <25" }
   ```
   plus file `.nvmrc` berisi `24.22.1` (keduanya kini sudah ada).
5. ✅ **DILAKUKAN (26 Okt 2026)** — **Jalankan perbaikan non-breaking** (di mesin ini gunakan `npm.cmd`, bukan `npm`):
   ```
   npm.cmd audit fix
   npm.cmd run lint     → EXIT 0, "No ESLint warnings or errors"
   npm.cmd run build    → EXIT 0, 19 halaman + middleware terkompilasi
   ```
   Hasil: **23 → 12 kerentanan**. Yang berhasil diperbaiki: `dompurify`, `proxy-addr`, `undici`, `zod`, `body-parser`, `source-map-js`, `fast-uri`, `ip-address`, `shadcn`, `@shadcn/registry`, `@modelcontextprotocol/sdk`.
6. **Jangan gunakan `npm audit fix --force`** — akan menarik upgrade mayor (`next@16.4.3`, `tailwindcss@4.3.3`, `eslint-config-next@16.4.3`, `firebase@9.14.0`) dan berisiko merusak build.

### 🟡 P2 — Rencana terjadwal

7. **Upgrade `next` dari 14.2.35** — 25 advisory, 3 critical RCE, tanpa perbaikan di jalur 14.x (keputusan lama di `SECURITY_AUDIT.md` §5.1: tunda). Opsi yang tercatat: naik ke **`next@15.5.x`** (jalur backport, risiko lebih rendah) atau **`next@16.4.3`** (satu-satunya target yang membuat `npm audit` hijau untuk `next`). Butuh jendela waktu + uji regresi (`npm run lint`, `npm run build`, uji alur utama).
8. **Audit `firebase` & `tailwindcss`** secara manual sebelum upgrade mayor (keduanya menuntut perubahan semver mayor).
9. **Tambahkan dependency scanning ke CI** — saat ini tidak ada `.github/`, `vercel.json`, maupun konfigurasi pemindaian keamanan apa pun (temuan lama `SECURITY_AUDIT.md` §8, tetap terbuka).
10. **Aktifkan notifikasi advisory**: langganan <https://groups.google.com/forum/#!forum/nodejs-sec> dan pantau <https://www.php.net/archive/> bila sewaktu-waktu ada komponen PHP.

---

## 8. Bagian G — Verifikasi Manual yang Tidak Bisa Dilakukan dari Repositori

1. **Versi runtime Node di Vercel** (dashboard) — memastikan ≥ versi aman rilis 21 Okt 2026.
2. **Tidak ada layanan PHP di luar repositori** (mis. server lama, panel hosting, CI runner) — jika ada, terapkan Bagian A.3/A.5.
3. **Status item terbuka `SECURITY_AUDIT.md`** — terutama `SECURITY_VERIFY.sql`, `CRON_SECRET`, dan kecocokan skema DB produksi.

---

## 9. Riwayat Tindakan Remediasi (26 Oktober 2026)

| # | Aksi | Perintah / Detail | Hasil |
|---|---|---|---|
| 1 | Perbaikan dependensi non-breaking | `npm.cmd audit fix` | ✅ **23 → 12** kerentanan (11 diperbaiki); hanya `package-lock.json` yang berubah |
| 2 | Sinkronisasi metadata lock | `npm.cmd install --package-lock-only` | ✅ EXIT 0, lock menyala `1.6.2` |
| 3 | Verifikasi lint | `npm.cmd run lint` | ✅ EXIT 0 — *"No ESLint warnings or errors"* |
| 4 | Verifikasi build | `npm.cmd run build` | ✅ EXIT 0 — `✓ Compiled successfully`, 19 halaman, middleware 81.6 kB |
| 5 | Pin versi Node | `package.json` → `"engines": { "node": ">=24.22.1 <25" }` | ✅ Dibuat |
| 6 | Pin versi Node (nvm) | file baru `.nvmrc` berisi `24.22.1` | ✅ Dibuat |
| 7 | Unduh & verifikasi Node v24.22.1 | `node-v24.22.1-win-x64.zip` (37,7 MB) dari nodejs.org, SHA256 dicocokkan dengan `SHASUMS256.txt` → `d2046d28…` | ✅ **Cocok persis** (autentik) |
| 8 | Instalasi portable **tanpa admin** | Ekstrak ke `%LOCALAPPDATA%\Programs\node-v24.22.1` + prepend PATH user (backup: `Temp\opencode\user-path-backup-20261026-085922.txt`) | ✅ `node` = **v24.22.1**, `npm` = **11.19.1** |
| 9 | Jadikan `node` default | Hapus `C:\Program Files\nodejs\` dari PATH mesin (butuh admin) — script siap: `Temp\opencode\aktifkan-node-24.cmd` | ⏳ **Menunggu Anda** (UAC) |

### 9.0a Temuan: Instalasi Portable Dikalahkan PATH Mesin

Windows membentuk `PATH` sebagai **mesin dahulu, baru user**. Karena `C:\Program Files\nodejs\` berada di PATH mesin (entry ke-6), instalasi portable di PATH user **tidak otomatis mengambil alih** `node`:

```
where node → C:\Program Files\nodejs\node.exe          (menang)
             ...\Programs\node-v24.22.1\node.exe       (kalah urutan)
node --version → v24.21.0                              ← masih lama
```

Verifikasi dilakukan dengan meniru urutan PATH persis seperti yang dibentuk Windows. Solusi tunggal tanpa opsi lain: **satu langkah elevated** untuk membuang entri lama dari PATH mesin (script `aktifkan-node-24.cmd` sudah mencadangkan PATH mesin sebelum mengubahnya; simulasi menunjukkan 8 → 7 entri, hanya `C:\Program Files\nodejs\` yang dibuang).

### 9.1 Sisa 12 Kerentanan (semua menuntut upgrade mayor)

| Severity | Paket | Perbaikan yang dibutuhkan |
|---|---|---|
| 🔴 critical | `next@14.2.35` (25 advisory) + `postcss` (transitive) | `next@16.4.3` atau jalur `15.5.x` |
| 🟠 high | `firebase` + `@firebase/firestore` + `@firebase/firestore-compat` + `@grpc/grpc-js` | upgrade mayor `firebase` |
| 🟠 high | `eslint-config-next@14.x` + `@next/eslint-plugin-next` + `glob` | `eslint-config-next@16.4.3` |
| 🟡 moderate | `tailwindcss` + `postcss-nested` + `postcss-selector-parser` | `tailwindcss@4.3.3` (mayor) |

### 9.2 Catatan Eksekusi

- **Efek samping script proyek:** `scripts/generate-updates.js` dijalankan otomatis saat Next memuat config (baik `lint`, `build`, maupun `dev`) — ia **membump `version` package.json dari 1.6.1 → 1.6.2** dan meregenerasi `src/data/updates-auto.json` (42 item, `v1.6.2`). Ini perilaku normal repo (terikat juga pada hook `predev`/`prebuild`); karena commit hash tidak berubah, tidak ada bump lanjutan pada run berikutnya.
- **`npm audit fix --force` tidak dijalankan** — sesuai Bagian F.6, perintah itu menarik `next@16.4.3`, `tailwindcss@4.3.3`, `eslint-config-next@16.4.3`, dan `firebase@9.14.0` (semua upgrade mayor yang berisiko merusak build).
- **5 paket install-script diblokir** oleh kebijakan `allowScripts` bawaan npm (`@firebase/util`, `@google/genai`, `core-js`, `protobufjs`, `unrs-resolver`) — kondisi bawaan lingkungan, **bukan** akibat perubahan ini; review dengan `npm install-scripts ls` bila diperlukan.
- **File yang berubah/ditambah:** `package.json` (engines + versi), `package-lock.json` (perbaikan dependensi), `src/data/updates-auto.json` (regenerasi), `.nvmrc` (baru), `.report/` (baru).
- **Belum dilakukan** (butuh akses/keputusan di luar repositori): upgrade Node runtime lokal ke 24.22.1, pengecekan versi runtime Vercel, dan upgrade mayor P2 (§7).

---

## 10. Lampiran — Sumber Primer

| Sumber | Tautan |
|---|---|
| PHP — Advisory RCE kritis (21 Okt 2026) | <https://www.php.net/archive/2026.php#2026-10-21-5> |
| PHP — Advisory session upload progress (23 Okt 2026) | <https://www.php.net/archive/2026.php#2026-10-23-1> |
| PHP — Pengumuman prarilis (20 Okt 2026) | <https://www.php.net/archive/2026.php#2026-10-20-1> |
| PHP — Rilis 8.5.12 / 8.4.27 / 8.3.36 / 8.2.35 | <https://www.php.net/ChangeLog-8.php> |
| GHSA — RCE via OOM corruption | <https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w> |
| GHSA — RCE via stale global state | <https://github.com/php/php-src/security/advisories/GHSA-6wmf-4rv5-p3rp> |
| Node.js — Security Releases 21 Okt 2026 | <https://nodejs.org/en/blog/vulnerability/october-2026-security-releases> |
| Node.js — v24.22.1 (Latest LTS) | <https://nodejs.org/en/blog/release/v24.22.1/> |
| Node.js — Security Release 29 Juli 2026 (lini 24.x: v24.18.1) | <https://nodejs.org/en/blog/vulnerability/july-2026-security-releases> |
| Node.js — Security Release 18 Juni 2026 (lini 24.x: v24.17.0) | <https://nodejs.org/en/blog/vulnerability/june-2026-security-releases> |
| Node.js — v26.12.1 / v22.23.4 | <https://nodejs.org/en/blog/release/v26.12.1/> · <https://nodejs.org/en/blog/release/v22.23.4/> |
| Node.js — arsip vulnerability blog | <https://nodejs.org/en/blog/vulnerability> |
| npm Audit Advisory Database | <https://github.com/advisories> |
| Audit internal proyek (5 Okt 2026) | `SECURITY_AUDIT.md` |

---

*Laporan dihasilkan 26 Oktober 2026 dari pemeriksaan read-only terhadap basis kode `finance_memo` dan sumber primer php.net/nodejs.org, lalu dilanjutkan dengan remediasi P1 (lihat §9): perubahan file proyek terbatas pada `package.json`, `package-lock.json`, `src/data/updates-auto.json`, `.nvmrc` (baru), dan folder `.report/` (baru).*
