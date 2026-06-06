# ROADMAP.md

Urutan pengerjaan berdasarkan prioritas dan dependensi antar fitur.
**Status Projek: SELESAI (100%)**

---

## PHASE 1 — Foundation & MVP (Target: 4–5 minggu)

Tujuan: User bisa login, tambah transaksi manual, dan lihat dashboard sederhana.

### Week 1 — Setup & Auth ✅
- [x] Init Next.js 14 project dengan TypeScript + Tailwind
- [x] Install & setup shadcn/ui
- [x] Setup Supabase project
- [x] Run migration `001_init.sql` dan `002_rls.sql`
- [x] Generate TypeScript types dari Supabase schema
- [x] Implementasi Supabase client (client, server, middleware)
- [x] Halaman login + Google OAuth flow
- [x] Middleware auth guard untuk `/dashboard/*`
- [x] Halaman onboarding (3 langkah)
- [x] Setup environment variables

**Deliverable:** User bisa login dengan Google dan selesai onboarding.

---

### Week 2 — Wallet & Kategori ✅
- [x] CRUD Wallets (`/dashboard/wallets`)
- [x] List & detail kategori
- [x] Tambah kategori custom
- [x] Komponen WalletCard + WalletForm
- [x] Komponen CategoryBadge

**Deliverable:** User bisa kelola wallet dan kategori.

---

### Week 3 — Transaksi Manual 🛠️ (Next)
- [x] Form tambah transaksi (income/expense)
- [x] Form transfer antar wallet
- [x] List transaksi dengan filter dasar (tipe, wallet)
- [x] Edit & hapus transaksi
- [x] Konfirmasi hapus modal

**Deliverable:** User bisa mencatat transaksi manual lengkap.

---

### Week 4 — Dashboard & Polish
- [x] Dashboard summary cards (income, expense, balance, saving)
- [x] Grafik pengeluaran per kategori (pie chart — Recharts)
- [x] List 5 transaksi terakhir
- [x] Responsif mobile (sidebar collapse, bottom nav mobile)
- [x] Loading states & skeleton UI
- [x] Error boundaries

**Deliverable:** MVP siap dipakai. Deploy ke Firebase App Hosting.

---

## PHASE 2 — AI & Reports (Target: +3 minggu)

Tujuan: Fitur unggulan — scan struk AI dan laporan visual.

### Week 5 — AI Scan Struk
- [x] Setup Google Gemini SDK
- [x] API route `/api/ai/scan-receipt`
- [x] Komponen ReceiptScanner (upload + preview)
- [x] Integrasi prompt ekstraksi struk
- [x] Auto-fill form transaksi dari hasil AI
- [x] Simpan ke tabel receipts
- [x] Konfirmasi user sebelum simpan
- [x] Error handling jika AI gagal / confidence rendah
- [x] Rate limiting (10 scan/user/jam)

**Deliverable:** User bisa scan struk dan data otomatis masuk ke form.

---

### Week 6 — Laporan & Export
- [x] Halaman laporan dengan filter bulan/tahun
- [x] Grafik tren 6 bulan (bar chart income vs expense)
- [x] Grafik breakdown per kategori
- [x] Filter by wallet di laporan
- [x] Export PDF via react-pdf atau jsPDF
- [x] Monthly trend di dashboard (chart 6 bulan)

**Deliverable:** User bisa lihat laporan lengkap dan export PDF.

---

### Week 7 — Recurring Transaction
- [x] Form template recurring
- [x] List & manajemen template
- [x] Supabase Edge Function `process-recurring`
- [x] Setup cron job (setiap hari jam 00:05 WIB)
- [x] Notifikasi in-app saat recurring diproses
- [x] Pause/resume template

**Deliverable:** Transaksi berulang berjalan otomatis.

---

## PHASE 3 — Notifications & Budgeting (Target: +2 minggu)

Tujuan: Budgeting envelope + sistem reminder multi-channel.

### Week 8 — Budgeting ✅
- [x] Form atur budget per kategori per bulan
- [x] Progress bar dengan warna dinamis
- [x] Copy budget dari bulan sebelumnya
- [x] Komponen BudgetProgress di dashboard
- [x] Budget alert (notif in-app saat >80%)
- [x] Edge Function `budget-alert` (cron harian pagi)

**Deliverable:** User bisa budgeting per kategori dengan alert otomatis.

---

### Week 9 — Reminder & Notifikasi
- [x] CRUD reminders
- [x] Notifikasi in-app (NotifCenter, bell icon, badge)
- [x] Realtime subscription via Supabase Realtime
- [x] Edge Function `send-reminder` (cron tiap jam)
- [x] Setup FCM untuk push notification (FCM Service Worker)
- [x] Permission request push notif di browser (Settings panel)
- [x] Setup Resend untuk email reminder (Edge Function integration)
- [x] Setting notifikasi (aktif/nonaktif per channel)
- [x] Upcoming reminders widget di dashboard

**Deliverable:** Sistem reminder berjalan multi-channel.

---

## PHASE 4 — Polish & Advanced (Target: +2 minggu, opsional)

- [x] AI insight bulanan (analisis pola pengeluaran)
- [x] Search transaksi global
- [x] Filter lanjutan (tag, rentang amount)
- [x] Dark mode
- [x] PWA manifest + service worker (installable)
- [x] Hapus akun + export semua data (GDPR-ready)
- [x] Performance audit (Lighthouse score > 90)
- [x] Setup analytics Firebase

---

## Dependensi Antar Fitur

```
Auth → Onboarding → Wallet → Kategori → Transaksi → Dashboard
                                                    → Budgeting
                                    → Scan Struk (AI)
                                    → Recurring
                     Reminder ←→ Notifikasi
                     Transaksi → Laporan
```

**Aturan:** Jangan mulai fitur jika dependensinya belum selesai.

---

## Definition of Done per Task

Sebuah task dianggap selesai jika:
- [ ] Kode berjalan tanpa TypeScript error
- [ ] RLS policy sudah cover semua query
- [ ] Error state ditangani dengan pesan yang jelas ke user
- [ ] Loading state ada (skeleton atau spinner)
- [ ] Tampilan responsif di mobile (375px) dan desktop (1280px)
- [ ] Kode mengikuti `CODING_STANDARDS.md`
