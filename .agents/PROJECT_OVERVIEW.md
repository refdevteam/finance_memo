# PROJECT_OVERVIEW.md

## Apa itu Fimo?

Fimo adalah web app pencatatan keuangan harian & bulanan berbasis AI yang dirancang untuk pengguna Indonesia. Aplikasi ini memungkinkan pengguna mencatat pemasukan dan pengeluaran, merencanakan anggaran, memindai struk otomatis menggunakan AI, dan menerima reminder untuk menabung atau membayar cicilan.

---

## Tech Stack

| Layer | Teknologi | Alasan |
|-------|-----------|--------|
| Frontend | Next.js 14 (App Router) + TypeScript | SSR/SSG, Server Actions, performa |
| Styling | Tailwind CSS + shadcn/ui | Konsisten, aksesibel, cepat |
| Grafik | Recharts | Ringan, kompatibel React |
| Auth | Supabase Auth (Google OAuth) | Terintegrasi native dengan DB |
| Database | Supabase PostgreSQL | RLS built-in, realtime, storage |
| File Storage | Supabase Storage | Penyimpanan foto struk |
| AI | Claude API (claude-sonnet-4-20250514) | Vision scan struk + klasifikasi |
| Push Notif | Firebase Cloud Messaging (FCM) | Push notification cross-platform |
| Email | Resend | Reminder email transaksional |
| Hosting | Firebase App Hosting | SSR support, CDN global |
| Scheduled Jobs | Supabase Edge Functions (cron) | Reminder, recurring transaction |

---

## Fitur Utama

### 1. Pencatatan Transaksi
- Input manual pemasukan / pengeluaran / transfer antar wallet
- Multi-wallet: kas tunai, rekening bank, e-wallet (GoPay, OVO, Dana), investasi
- Kategori custom + kategori default sistem (15 kategori default IDR-friendly)
- Tag bebas untuk filter lanjutan
- Multi-currency dengan IDR sebagai default

### 2. Scan Struk via AI
- Upload foto struk → Claude Vision mengekstrak data otomatis
- Klasifikasi tipe: belanja, pembayaran, pay slip, transfer, top-up, tagihan
- Auto-fill form transaksi — user tinggal konfirmasi
- Log hasil ekstraksi AI disimpan di tabel `receipts`

### 3. Budgeting Bulanan
- Atur anggaran per kategori per bulan
- Progress bar realtime (dari total transaksi bulan berjalan)
- Alert otomatis jika anggaran mendekati/melebihi batas (notifikasi in-app)
- Model "envelope budgeting" — tiap kategori punya jatah sendiri

### 4. Reminder Cerdas
- Reminder menabung, bayar cicilan, langganan, tagihan
- Channel: Push Notification (FCM), Email (Resend), In-app notification
- Frekuensi: sekali, harian, mingguan, bulanan, tahunan
- Recurring transaction: cicilan KPR, Netflix, dll — otomatis terbuat tiap periode

### 5. Laporan & Visualisasi
- Dashboard: summary card (total pemasukan, pengeluaran, saldo, tabungan bulan ini)
- Grafik pengeluaran per kategori (pie chart)
- Tren bulanan 6 bulan terakhir (line/bar chart)
- Export laporan ke PDF
- Filter by wallet, kategori, rentang tanggal

### 6. Onboarding
- Setup profil keuangan: nama, mata uang, timezone
- Tambah wallet pertama
- Atur target tabungan bulan ini

---

## Target Pengguna

- Usia 20–40 tahun, melek teknologi
- Pengguna smartphone dengan akun Google
- Ingin mengontrol keuangan pribadi / keluarga kecil
- Lokasi: Indonesia (IDR, bahasa Indonesia UI)

---

## Non-Goals (Tidak dikerjakan di scope ini)

- Integrasi langsung dengan rekening bank (Open Banking)
- Multi-user / shared finance keluarga besar
- Fitur investasi / portfolio management
- Mobile native app (iOS/Android) — hanya PWA-ready web

---

## Keputusan Desain Penting

1. **Supabase Auth saja** — tidak menggunakan Firebase Auth agar tidak ada JWT bridging dua sistem
2. **Server Actions untuk semua mutation** — tidak ada REST API terpisah untuk CRUD
3. **RLS wajib di semua tabel** — tidak ada data user yang bisa diakses user lain
4. **AI sebagai asisten, bukan otomasi penuh** — hasil scan AI selalu dikonfirmasi user sebelum disimpan
5. **IDR first** — semua kalkulasi dalam IDR, currency lain hanya untuk tampilan
