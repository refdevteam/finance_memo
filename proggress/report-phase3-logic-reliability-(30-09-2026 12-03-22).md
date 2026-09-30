# Report — Phase 3: Logic & Reliability

**Tanggal:** 30-09-2026 12:03
**Plan:** plan-phase3-logic-reliability-(30-09-2026 11-48-52).md
**Status:** SELESAI (terverifikasi + deployed)

## Ringkasan
Tiga task logika/reliabilitas dieksekusi, diverifikasi, dan dua bagian (migration + Edge Functions) sudah di-deploy ke Supabase.

## Task 3.1 — Fallback skor AI Coach diselaraskan dengan aturan prompt
**File:** `src/actions/ai-coach.ts`

- Menambah helper `calculateFallbackScore(type, income, expense, income30Days, totalBudget)`:
  - Skor **0** jika tidak ada transaksi (`income === 0 && expense === 0`).
  - **daily:** expense > 20% income30Days → 45; > 5% → 65; selain itu → 85 (tanpa referensi income: 70/75).
  - **weekly:** over budget → 35; expense > 30% income30Days → 45; > 25% → 60; selain itu → 75.
  - **30days:** defisit (expense > income) → 40; savings rate ≥ 20% → 85; ≥ 10% → 75; selain itu → 65.
  - **month:** over budget → 35; jika ada income → dinilai dari savings rate; tanpa income → 60/65.
- Fallback dipakai di **2 tempat**: (a) GEMINI_API_KEY kosong, (b) error eksekusi Gemini API — sebelumnya hardcoded `score: 70`/sejenis yang melanggar aturan prompt (mis. kasus tanpa transaksi tetap dapat skor > 0).
- Setelah review: param `userStreak` ternyata tidak dipakai di dalam perhitungan skor → **dihapus** dari signature & 2 call site untuk memperbaiki lint error `@typescript-eslint/no-unused-vars` yang muncul saat verifikasi.

## Task 3.2 — Rate limit edit wallet berbasis database
**Files:** `src/actions/wallets.ts`, `supabase/migrations/20260930150000_add_wallet_rate_limit.sql`

- Migration menambah kolom `wallet_edit_count` & `wallet_edit_date` di tabel `profiles` — **SUDAH di-push/applied** (`supabase db push`).
- `updateWallet` sekarang menghitung limit **5x per hari** via kolom database (bukan cookie), reset otomatis saat tanggal berganti; import `cookies` dihapus.

## Task 3.3 — Retry otomatis untuk panggilan eksternal di Edge Functions
**Files:** `supabase/functions/_shared/retry.ts` + 4 Edge Functions

- Helper baru `_shared/retry.ts`: `withRetry()` & `fetchWithRetry()` — exponential backoff + jitter, `maxAttempts: 3`, retry hanya pada network error / 5xx / 429.
- Diterapkan pada:
  - `send-reminder/index.ts` — kirim email Resend & `sendFcmPush()`.
  - `budget-alert/index.ts` — kirim notifikasi.
  - `process-recurring/index.ts` — kirim notifikasi transaksi berulang.
  - `send-fcm-notification/index.ts` — kirim FCM push.

## Hasil Verifikasi
| Check | Hasil |
|---|---|
| `rtk lint` | 11 errors di 5 file — **semua pre-existing** di script lama (`generate-updates.js`, `replace.js`, `copy-assets.js`, `copy-logo.js`, `firebase-messaging-sw.js`); 0 error baru |
| `rtk npx tsc --noEmit` | No errors found |
| `rtk npm run build` | ✓ Compiled successfully, 18 halaman, versi v1.5.0 |

> Catatan: selama verifikasi sempat muncul 1 error baru (`ai-coach.ts` no-unused-vars) yang sudah diperbaiki (penghapusan param `userStreak`), sehingga lint kembali bersih dari regresi.

## Deployment (Supabase project `fsqzpmxaotqabpznbyny`)
- Migration `20260930150000_add_wallet_rate_limit.sql` — applied via `supabase db push`.
- `send-reminder` — deployed.
- `budget-alert` — deployed.
- `process-recurring` — deployed.
- `send-fcm-notification` — deployed.
- (Semua upload menyertakan `_shared/retry.ts`.)

## Risiko / Catatan Lanjutan
- Rate limit wallet kini bergantung pada kolom `profiles`; aman untuk multi-device karena server-side.
- Jika deploy via Docker diperlukan untuk bundle berbeda, perhatikan warning `Docker is not running` (tidak menghalangi upload asset).
- Skor fallback AI Coach kini konsisten dengan prompt, namun tetap pendekatan heuristik — bukan hasil Gemini.
