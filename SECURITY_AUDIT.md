# Laporan Audit Keamanan Siber (Cybersecurity Audit Report) - Fimo

Laporan ini memuat analisis keamanan arsitektur web aplikasi Fimo (Next.js, Supabase, Firebase) untuk mendeteksi kerentanan keamanan siber dan langkah-langkah mitigasi yang telah diterapkan untuk mengamankan data pengguna.

---

## 🛡️ Status Ringkasan Keamanan

*   **Row-Level Security (RLS)**: **SANGAT KUAT**. Semua tabel di skema `public` (`profiles`, `wallets`, `transactions`, `categories`, `receipts`, dll.) telah mengaktifkan RLS dengan kebijakan (*policies*) yang membatasi hak akses data hanya untuk pemilik data (`user_id = auth.uid()`).
*   **Validasi Input**: **KUAT**. Menggunakan pustaka `Zod` di hampir semua formulir dan Server Actions untuk mencegah malformasi data dan upaya *injection*.
*   **Autentikasi**: **KUAT**. Menggunakan Supabase Auth dengan Google Identity Services (GSI) OAuth.

---

## 🔍 Kerentanan yang Ditemukan & Telah Dimitigasi (FIXED)

Kami telah melakukan pemeriksaan menyeluruh dan langsung mengimplementasikan perbaikan keamanan pada kerentanan kritis berikut:

### 1. Kerentanan Open Redirect (Kerentanan Kritis)
*   **Lokasi**: [src/app/auth/callback/route.ts](file:///d:/Data/My%20SSD/Documents/My-Project/fimo/finance_memo/src/app/auth/callback/route.ts)
*   **Temuan**: Parameter `next` dari URL *query* langsung digunakan sebagai tujuan pengalihan (*redirect*) setelah pertukaran kode autentikasi OAuth berhasil tanpa validasi. Penyerang dapat memanfaatkan ini untuk mengirim tautan berbahaya (misal `?next=//evil.com`) guna memicu *Session Hijacking* atau *Phishing*.
*   **Mitigasi yang Diterapkan**: Menambahkan fungsi sanitasi ketat yang memvalidasi parameter `next`. Sistem kini hanya mengizinkan pengalihan ke *relative path* yang aman (dimulai dengan `/` tunggal, tidak diawali dengan `//`, dan tidak berisi skema protokol seperti `http://` atau `https://`). Jika tidak valid, pengalihan akan diarahkan secara aman ke `/dashboard`.

### 2. Missing Authentication & Ownership Verification di Server Actions (Kerentanan Menengah)
*   **Lokasi**: 
    *   [src/actions/wallets.ts](file:///d:/Data/My%20SSD/Documents/My-Project/fimo/finance_memo/src/actions/wallets.ts) (`deleteWallet`)
    *   [src/actions/categories.ts](file:///d:/Data/My%20SSD/Documents/My-Project/fimo/finance_memo/src/actions/categories.ts) (`deleteCategory`)
*   **Temuan**: Fungsi-fungsi Server Actions untuk penghapusan data di atas dipanggil tanpa memeriksa apakah user telah terautentikasi dan apakah data tersebut benar-benar milik pengguna yang memicu permintaan tersebut. Meskipun database RLS memblokir aksi ilegal ini, ketiadaan validasi di tingkat aplikasi merupakan celah *defense-in-depth* yang buruk.
*   **Mitigasi yang Diterapkan**:
    *   Menambahkan pemeriksaan sesi user menggunakan `supabase.auth.getUser()`. Jika tidak ada sesi aktif, server action akan langsung menolak aksi dan melempar galat `Unauthorized`.
    *   Menambahkan klausa `.eq('user_id', user.id)` di dalam eksekusi kueri hapus (`.delete()`) Supabase. Ini memastikan secara eksplisit bahwa pengguna hanya dapat menghapus record milik mereka sendiri di tingkat logika server action.

### 3. Risiko Denial of Service (DoS) Melalui Unggah File (Kerentanan Menengah)
*   **Lokasi**: [src/app/api/ai/scan-receipt/route.ts](file:///d:/Data/My%20SSD/Documents/My-Project/fimo/finance_memo/src/app/api/ai/scan-receipt/route.ts)
*   **Temuan**: Rute API pemindaian struk (`POST`) menerima berkas struk tanpa membatasi ukuran berkas (*file size*) dan jenis tipe berkas (*MIME type*). Pengguna berbahaya dapat mengunggah file non-gambar berukuran raksasa (misal file biner 100MB) yang dapat menghabiskan memori server (*Out of Memory*), memicu *Denial of Service* (DoS), serta melambungkan biaya API LLM pihak ketiga (Gemini/Groq).
*   **Mitigasi yang Diterapkan**:
    *   Menambahkan pembatasan ukuran file maksimal **5MB**. Jika melebihi batas, permintaan langsung ditolak di awal dengan status `400 Bad Request`.
    *   Menambahkan *whitelist* MIME type yang ketat: hanya menerima gambar (`image/jpeg`, `image/png`, `image/webp`, `image/gif`) dan berkas PDF (`application/pdf`).

---

## 📈 Rekomendasi Peningkatan Keamanan Masa Depan (Hardening)

Untuk meningkatkan proteksi aplikasi Fimo ke tingkat produksi yang lebih matang, kami menyarankan beberapa langkah tambahan berikut:

### 1. Penyelesaian Hapus Akun Secara Kepatuhan (GDPR Compliance)
*   **Analisis**: Pada Server Action [src/actions/gdpr.ts](file:///d:/Data/My%20SSD/Documents/My-Project/fimo/finance_memo/src/actions/gdpr.ts) (`deleteUserAccount`), sistem menghapus profil pengguna di tabel `public.profiles` dan data terkait, tetapi tidak menghapus user di tabel sistem `auth.users`. Hal ini menyisakan akun "yatim piatu" (*orphan account*) di database autentikasi utama Supabase.
*   **Rekomendasi**: Buat fungsi trigger database PostgreSQL atau panggil API Admin Supabase `supabase.auth.admin.deleteUser(user_id)` dengan menggunakan *Service Role Client* (pada backend yang aman) untuk menghapus record pengguna di tabel autentikasi secara menyeluruh saat pengguna mengajukan penghapusan akun.

### 2. Optimasi Double-Call `getUser()` pada Middleware
*   **Analisis**: Pada [src/middleware.ts](file:///d:/Data/My%20SSD/Documents/My-Project/fimo/finance_memo/src/middleware.ts), fungsi memanggil `updateSession(request)` (yang di dalamnya memicu `supabase.auth.getUser()`), dan setelah itu langsung memanggil `supabase.auth.getUser()` sekali lagi untuk pemeriksaan rute dasbor. Ini menyebabkan dua kali pemanggilan jaringan beruntun ke server Supabase untuk setiap permintaan halaman.
*   **Rekomendasi**: Ubah fungsi `updateSession` agar turut mengembalikan objek `user` hasil pembacaan token autentikasi pertama, sehingga middleware Next.js tidak perlu melakukan panggilan HTTP kedua ke Supabase Auth.

### 3. Konfigurasi Content Security Policy (CSP)
*   **Analisis**: Aplikasi memuat skrip eksternal seperti SDK Google Identity Services (`https://accounts.google.com/gsi/client`) dan layanan Firebase. Tanpa CSP, aplikasi rentan terhadap serangan *Cross-Site Scripting* (XSS) apabila terjadi kebocoran token.
*   **Rekomendasi**: Terapkan header HTTP `Content-Security-Policy` di dalam `next.config.js` atau middleware Next.js untuk membatasi asal muasal skrip, gaya, gambar, dan koneksi API yang boleh dijalankan aplikasi.
