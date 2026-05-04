# ROADMAP.md

Urutan pengerjaan berdasarkan prioritas dan dependensi antar fitur.
**Phase aktif saat ini: PHASE 1**

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
- [ ] Form tambah transaksi (income/expense)
- [ ] Form transfer antar wallet
- [ ] List transaksi dengan filter dasar (tipe, wallet)
- [ ] Edit & hapus transaksi
- [ ] Konfirmasi hapus modal

**Deliverable:** User bisa mencatat transaksi manual lengkap.

---

### Week 4 — Dashboard & Polish
- [ ] Dashboard summary cards (income, expense, balance, saving)
- [ ] Grafik pengeluaran per kategori (pie chart — Recharts)
- [ ] List 5 transaksi terakhir
- [ ] Responsif mobile (sidebar collapse, bottom nav mobile)
- [ ] Loading states & skeleton UI
- [ ] Error boundaries

**Deliverable:** MVP siap dipakai. Deploy ke Firebase App Hosting.

---

## PHASE 2 — AI & Reports (Target: +3 minggu)

Tujuan: Fitur unggulan — scan struk AI dan laporan visual.

### Week 5 — AI Scan Struk
- [ ] Setup Anthropic SDK
- [ ] API route `/api/ai/scan-receipt`
- [ ] Komponen ReceiptScanner (upload + preview)
- [ ] Integrasi prompt ekstraksi struk
- [ ] Auto-fill form transaksi dari hasil AI
- [ ] Simpan ke tabel receipts
- [ ] Konfirmasi user sebelum simpan
- [ ] Error handling jika AI gagal / confidence rendah
- [ ] Rate limiting (10 scan/user/jam)

**Deliverable:** User bisa scan struk dan data otomatis masuk ke form.

---

### Week 6 — Laporan & Export
- [ ] Halaman laporan dengan filter bulan/tahun
- [ ] Grafik tren 6 bulan (bar chart income vs expense)
- [ ] Grafik breakdown per kategori
- [ ] Filter by wallet di laporan
- [ ] Export PDF via react-pdf atau jsPDF
- [ ] Monthly trend di dashboard (chart 6 bulan)

**Deliverable:** User bisa lihat laporan lengkap dan export PDF.

---

### Week 7 — Recurring Transaction
- [ ] Form template recurring
- [ ] List & manajemen template
- [ ] Supabase Edge Function `process-recurring`
- [ ] Setup cron job (setiap hari jam 00:05 WIB)
- [ ] Notifikasi in-app saat recurring diproses
- [ ] Pause/resume template

**Deliverable:** Transaksi berulang berjalan otomatis.

---

## PHASE 3 — Notifications & Budgeting (Target: +2 minggu)

Tujuan: Budgeting envelope + sistem reminder multi-channel.

### Week 8 — Budgeting
- [ ] Form atur budget per kategori per bulan
- [ ] Progress bar dengan warna dinamis
- [ ] Copy budget dari bulan sebelumnya
- [ ] Komponen BudgetProgress di dashboard
- [ ] Budget alert (notif in-app saat >80%)
- [ ] Edge Function `budget-alert` (cron harian pagi)

**Deliverable:** User bisa budgeting per kategori dengan alert otomatis.

---

### Week 9 — Reminder & Notifikasi
- [ ] CRUD reminders
- [ ] Notifikasi in-app (NotifCenter, bell icon, badge)
- [ ] Realtime subscription via Supabase Realtime
- [ ] Edge Function `send-reminder` (cron tiap jam)
- [ ] Setup FCM untuk push notification
- [ ] Permission request push notif di browser
- [ ] Setup Resend untuk email reminder
- [ ] Setting notifikasi (aktif/nonaktif per channel)
- [ ] Upcoming reminders widget di dashboard

**Deliverable:** Sistem reminder berjalan multi-channel.

---

## PHASE 4 — Polish & Advanced (Target: +2 minggu, opsional)

- [ ] AI insight bulanan (analisis pola pengeluaran)
- [ ] Search transaksi global
- [ ] Filter lanjutan (tag, rentang amount)
- [ ] Dark mode
- [ ] PWA manifest + service worker (installable)
- [ ] Hapus akun + export semua data (GDPR-ready)
- [ ] Performance audit (Lighthouse score > 90)
- [ ] Setup analytics Firebase

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
