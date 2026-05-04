# FEATURES.md

Spesifikasi lengkap setiap fitur. Gunakan sebagai referensi saat implementasi.

---

## F1 — Autentikasi (Google OAuth via Supabase)

**File terkait:** `app/auth/login/`, `app/auth/callback/`, `middleware.ts`

**Flow:**
1. User klik "Masuk dengan Google" di halaman `/auth/login`
2. Redirect ke Supabase OAuth → Google consent screen
3. Callback ke `/auth/callback` → exchange code untuk session
4. Trigger `handle_new_user()` otomatis buat row di `profiles`
5. Redirect ke `/dashboard` (jika sudah onboarded) atau `/onboarding`

**Middleware protection:**
- Semua route `/dashboard/*` cek session via `middleware.ts`
- Session expired → redirect ke `/auth/login?redirect=/dashboard/...`

---

## F2 — Onboarding

**File terkait:** `app/onboarding/`, komponen wizard

**Langkah:**
1. Setup nama & preferensi (currency, timezone)
2. Tambah wallet pertama (wajib minimal 1)
3. Atur target tabungan bulan ini (opsional)
4. Set `profiles.onboarded = true`

**Skip condition:** Jika `profiles.onboarded = true`, langsung ke dashboard.

---

## F3 — Pencatatan Transaksi

**File terkait:** `app/dashboard/transactions/`, `components/transactions/`, `actions/transactions.ts`

### F3.1 — Input Manual
**Form fields:**
- Tipe (income / expense) — toggle button
- Wallet (dropdown dari wallets user)
- Jumlah (number input, format IDR)
- Kategori (dropdown + search, tampilkan icon + warna)
- Tanggal (date picker, default: hari ini)
- Deskripsi (text, required)
- Catatan (textarea, optional)
- Tag (multi-select input, optional)
- Recurring toggle (jika aktif → pilih frekuensi)

**Validasi:**
- Amount > 0
- Wallet harus dipilih
- Description tidak boleh kosong
- Tanggal tidak boleh di masa depan lebih dari 1 hari

### F3.2 — Transfer Antar Wallet
- Pilih wallet asal dan tujuan
- Jumlah transfer
- Buat 2 transaksi (expense dari wallet asal, income ke wallet tujuan)
- Buat 1 row di `wallet_transfers` untuk link keduanya

### F3.3 — List Transaksi
- Infinite scroll atau pagination (20 per halaman)
- Filter: wallet, kategori, tipe, rentang tanggal, tag
- Search by deskripsi
- Sort: terbaru, terlama, terbesar, terkecil
- Grouped by date (header tanggal, list transaksi)
- Swipe to delete (mobile) / tombol hapus

### F3.4 — Edit Transaksi
- Buka form pre-filled dengan data existing
- Validasi sama dengan create
- Update balance wallet otomatis via trigger

---

## F4 — Scan Struk AI

**File terkait:** `components/transactions/ReceiptScanner.tsx`, `app/api/ai/scan-receipt/`, `lib/ai/`

**UI Flow:**
1. Tombol "Scan Struk" di halaman tambah transaksi
2. Modal: pilih upload foto / kamera (mobile)
3. Preview foto + tombol "Scan"
4. Loading state: "AI sedang membaca struk..."
5. Hasil tampil: merchant, total, tanggal, items, kategori saran
6. User bisa edit hasil sebelum konfirmasi
7. Konfirmasi → createTransaction() + update receipt.is_processed

**Fallback jika AI gagal:**
- Tampilkan pesan error yang friendly
- Form manual muncul dengan field yang sudah diisi sebagian (jika ada)
- Gambar tetap tersimpan di storage

---

## F5 — Budgeting Bulanan

**File terkait:** `app/dashboard/budgets/`, `components/dashboard/BudgetProgress.tsx`, `actions/budgets.ts`

**Fitur:**
- Atur anggaran per kategori per bulan
- Progress bar: spent / budget dengan warna dinamis
  - 0–70%: hijau
  - 70–90%: kuning
  - >90%: merah (dengan alert)
- Spent dihitung realtime dari tabel transactions
- Copy budget dari bulan sebelumnya (quick setup)
- Total budget vs total actual di summary

**Alert Budget:**
- Notifikasi in-app saat spending mencapai 80% budget kategori tertentu
- Notifikasi saat melebihi budget (100%)
- Dikirim via Edge Function `budget-alert` yang jalan setiap pagi

---

## F6 — Multi-Wallet

**File terkait:** `app/dashboard/wallets/`, `actions/wallets.ts`

**Tipe wallet:** cash, bank, ewallet, investment, other

**Fitur:**
- Tambah/edit/archive wallet (tidak hapus permanent — soft delete)
- Tampilkan saldo per wallet (auto-update dari transaksi)
- Total saldo semua wallet di dashboard
- Pilih wallet default untuk input transaksi baru
- Warna & icon custom per wallet

---

## F7 — Recurring Transaction

**File terkait:** `actions/recurring.ts`, `supabase/functions/process-recurring/`

**Cara kerja:**
- User buat template recurring (nama, amount, kategori, frekuensi)
- Setiap hari jam 00:05 WIB, Edge Function cek `recurring_templates WHERE next_due_date <= TODAY AND is_active = TRUE`
- Auto-create transaksi
- Update `next_due_date` ke periode berikutnya
- Kirim notifikasi: "Cicilan KPR Rp 3.500.000 telah dicatat otomatis"

**Frekuensi:** daily, weekly, monthly, yearly

---

## F8 — Reminder

**File terkait:** `app/dashboard/reminders/`, `supabase/functions/send-reminder/`

**Tipe reminder:** saving, installment, subscription, bill, custom

**Channel notifikasi:**
- **In-app:** Selalu aktif, muncul di notification center
- **Push (FCM):** Opsional, butuh permission dari user
- **Email:** Opsional, kirim via Resend

**Logika pengiriman:**
- Edge Function `send-reminder` jalan setiap jam
- Query `reminders WHERE next_remind <= NOW() AND is_active = TRUE`
- Kirim notif sesuai channel yang dipilih
- Update `next_remind` ke waktu berikutnya
- Insert ke `notifications` table (untuk in-app)

---

## F9 — Dashboard

**File terkait:** `app/dashboard/dashboard/`, `components/dashboard/`

**Komponen:**
1. **Summary Cards** (4 card)
   - Total Pemasukan bulan ini
   - Total Pengeluaran bulan ini
   - Total Saldo semua wallet
   - Tabungan bulan ini (pemasukan - pengeluaran)

2. **Budget Progress** — top 3 kategori yang paling banyak dipakai

3. **Spending by Category** — pie chart pengeluaran bulan ini

4. **Recent Transactions** — 5 transaksi terakhir

5. **Monthly Trend** — bar chart 6 bulan terakhir (income vs expense)

6. **Upcoming Reminders** — reminder jatuh tempo dalam 7 hari ke depan

---

## F10 — Laporan

**File terkait:** `app/dashboard/reports/`, `lib/utils/export.ts`

**Filter:** bulan/tahun, wallet, kategori, tipe transaksi

**Visualisasi:**
- Trend income vs expense (line chart, 12 bulan)
- Breakdown per kategori (bar chart + tabel)
- Saldo per wallet (bar chart)

**Export:**
- PDF: tabel transaksi + grafik ringkasan (via jsPDF / react-pdf)
- Format nama file: `Fimo_Laporan_YYYY-MM.pdf`

---

## F11 — Notifikasi In-App

**File terkait:** `components/layout/NotifCenter.tsx`, `hooks/useRealtime.ts`

**Implementasi:**
- Bell icon di Navbar dengan badge jumlah unread
- Dropdown/panel notifikasi saat diklik
- Realtime update via Supabase Realtime subscription
- Klik notifikasi → navigate ke `action_url` + mark as read
- "Tandai semua dibaca" bulk action

---

## F12 — Settings

**File terkait:** `app/dashboard/settings/`

**Section:**
- Profil: nama, foto (upload ke Supabase Storage)
- Preferensi: currency default, timezone, bahasa
- Notifikasi: aktifkan/nonaktifkan push, email
- Kategori: kelola kategori custom
- Data: export semua data (CSV), hapus akun
