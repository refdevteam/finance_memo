# Feature Report: Auto-Sync Cash Flow via Gmail API

**Date**: 19 July 2026
**Status**: FEASIBILITY STUDY & PLAN (DO NOT EXECUTE YET)
**Related Rules**: `AGENT.md`, `antigravity-rtk-rules.md` (RTK)

---

## 1. Executive Summary
Penambahan fitur pencatatan kas (cash flow) otomatis dengan membaca email notifikasi mutasi/pembayaran bank dari Gmail **sangat mungkin (feasible)** untuk diimplementasikan. Fitur ini akan menggunakan integrasi Google Gmail API yang dipadukan dengan LLM (Fimo AI - Claude/Gemini) untuk membaca teks email tidak terstruktur dan mengekstrak data transaksi (nominal, tipe, kategori, tanggal) ke dalam format JSON yang dapat disimpan langsung ke Supabase.

## 2. Technical Feasibility & Constraints

### 2.1 Google OAuth & Scopes
Untuk membaca kotak masuk pengguna, aplikasi Fimo membutuhkan otorisasi Google OAuth dengan *scope*:
`https://www.googleapis.com/auth/gmail.readonly`

**Constraint (Batasan Keamanan Google):**
Scope ini termasuk kategori **Restricted Scope**.
- **Untuk Production (Publik):** Mewajibkan audit keamanan tahunan (CASA Tier 2) oleh pihak ketiga yang bersertifikat. Ini memakan waktu dan biaya besar.
- **Untuk Development/Beta:** Dapat dijalankan tanpa audit dengan mempertahankan status aplikasi di Google Cloud Console pada mode **"Testing"**. Limitasi mode ini adalah aplikasi hanya bisa diakses oleh maksimal 100 email penguji (test users) yang harus didaftarkan secara manual.

### 2.2 Arsitektur Trigger (Otomatis vs Manual)
Terdapat dua pendekatan utama untuk menarik data email:
1. **Background Auto-Sync (Cron/PubSub):**
   - **Kelebihan:** Berjalan mulus di latar belakang tanpa interaksi user.
   - **Kelemahan:** Membutuhkan penyimpanan `provider_refresh_token` OAuth Google secara permanen dan terenkripsi di database (`pgsodium` atau Supabase Vault). Membutuhkan konfigurasi cron yang kompleks.
2. **Manual Sync (In-App Button):**
   - **Kelebihan:** Jauh lebih aman dan sederhana. Hanya dieksekusi saat user memencet tombol "Sinkronisasi Sekarang" di Dashboard menggunakan token sesi aktif mereka. Tidak perlu menyimpan *refresh token* permanen ke tabel.
   - **Kelemahan:** User harus login dan menekan tombol.

## 3. Implementation Plan (Architecture)

Sesuai dengan aturan di `AGENT.md` dan struktur proyek Fimo, ini adalah rencana *end-to-end*:

### A. Database & Auth (Supabase)
- **Modifikasi Auth Flow:** Fimo saat ini menggunakan Google One Tap (hanya mengembalikan ID Token). Fimo perlu menambahkan sebuah tombol "Hubungkan Gmail" di halaman Pengaturan/Profil yang memanggil `supabase.auth.signInWithOAuth({ provider: 'google', scopes: 'https://www.googleapis.com/auth/gmail.readonly', options: { queryParams: { access_type: 'offline' } } })`.

### B. Backend (Supabase Edge Functions)
- **Fungsi Baru `sync-gmail-transactions`:**
  1. Menerima *request* dari user (menyertakan Access Token Google).
  2. Memanggil Gmail API (`GET https://gmail.googleapis.com/gmail/v1/users/me/messages`).
  3. Mem-filter pesan berdasarkan *sender* spesifik bank (misal: BCA, Mandiri, Jenius).
  4. Mendekode *body* email dari Base64.
  5. Mengirim teks email ke Claude/Gemini API (sama seperti fitur Scan Struk) dengan instruksi sistem ketat untuk *output* JSON: `{ amount, type: "income" | "expense", category_id, description, date }`.
  6. Menyimpan *array* transaksi tersebut ke tabel `transactions` via Supabase client.
  7. Menandai email yang sudah diproses dengan menambahkan Label "Fimo Processed" via Gmail API untuk mencegah duplikasi pemrosesan.

### C. Frontend (UI)
- Komponen `GmailSyncCard` di Dashboard untuk mengontrol integrasi. Komponen ini akan memanggil Server Action atau langsung memanggil Edge Function dengan membawa OAuth Token user saat ini.

### D. Kepatuhan Aturan
- Sesuai instruksi keamanan `AGENT.md`, kita tidak mengekspos *service_role key* di *client*. Semuanya ditangani oleh Edge Function.
- Sesuai dengan **RTK - Rust Token Killer (Google Antigravity)**, selama proses eksekusi dan pendelegasian perintah CLI (seperti `supabase functions new` atau tes lokal), kita akan selalu melakukan *prefix* dengan perintah `rtk` (contoh: `rtk supabase functions serve`).

---
**Note:** Rencana ini adalah laporan observasi. Eksekusi belum akan dilakukan sebelum ada persetujuan lebih lanjut.
