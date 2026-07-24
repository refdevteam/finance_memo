# Fimo — Agent Configuration
> Panduan utama untuk AI agent dalam membangun aplikasi pencatatan keuangan Fimo.
> Baca file ini sebelum memulai task apapun.

---

## Identitas Proyek

**Nama:** Fimo  
**Deskripsi:** Web app pencatatan keuangan harian & bulanan personal berbasis AI  
**Stack:** Next.js 14 + TypeScript · Supabase · Claude AI · Firebase App Hosting  
**Target user:** Pengguna Indonesia, currency default IDR  

---

## Dokumen Referensi

Baca dokumen berikut sesuai konteks task yang sedang dikerjakan:

| File | Kapan Dibaca |
|------|-------------|
| `docs/PROJECT_OVERVIEW.md` | Awal setiap sesi baru |
| `docs/ARCHITECTURE.md` | Task backend, API, infrastruktur |
| `docs/DATABASE_SCHEMA.md` | Task yang menyentuh database/query |
| `docs/FEATURES.md` | Task implementasi fitur baru |
| `docs/ROADMAP.md` | Prioritas dan urutan pengerjaan |
| `docs/CODING_STANDARDS.md` | Sebelum menulis kode apapun |
| `docs/AI_INTEGRATION.md` | Task scan struk, AI classification |

---

## Aturan Wajib Agent

### Sebelum Menulis Kode
- [ ] Baca `CODING_STANDARDS.md`
- [ ] Identifikasi layer yang terpengaruh (UI / Server Action / DB)
- [ ] Cek apakah ada tabel/type yang relevan di `DATABASE_SCHEMA.md`
- [ ] Pastikan RLS policy sudah cover data yang diakses

### Saat Menulis Kode
- Semua query ke Supabase **harus** melalui Server Actions (`/actions/*.ts`), bukan dari client component langsung
- Semua input user **wajib** divalidasi dengan Zod sebelum masuk ke database
- Gunakan TypeScript strict — tidak ada `any` kecuali terpaksa dan diberi komentar alasan
- Setiap fungsi yang mengakses DB wajib handle error dan return `{ data, error }` pattern
- Komponen UI menggunakan shadcn/ui sebagai base, Tailwind untuk kustomisasi

### Naming Convention
```
Files/Folders : kebab-case          → transaction-list.tsx
Components    : PascalCase          → TransactionList
Functions     : camelCase           → getTransactions()
DB tables     : snake_case          → wallet_transfers
Constants     : SCREAMING_SNAKE     → DEFAULT_CURRENCY
Types/Interfaces : PascalCase + suffix → TransactionRow, BudgetFormData
Server Actions: verb + noun         → createTransaction, updateBudget
```

### Larangan Keras
- ❌ Jangan pernah expose Supabase service key ke client
- ❌ Jangan bypass RLS dengan `service_role` kecuali di Edge Function dengan alasan jelas
- ❌ Jangan simpan data keuangan sensitif di localStorage atau cookie tanpa enkripsi
- ❌ Jangan hardcode nilai currency, timezone, atau locale — selalu ambil dari `profiles`
- ❌ Jangan buat API route baru jika Server Action sudah cukup
- ❌ Jangan jalankan `npx tsc --noEmit` atau command `tsc` type-check otomatis (memakan waktu terlalu lama) kecuali diminta eksplisit oleh user.

---

## Cara Agent Menyelesaikan Task

```
1. BACA   → Pahami task, baca doc relevan
2. RENCANA → Breakdown langkah, identifikasi file yang perlu dibuat/diubah
3. KODE   → Implementasi sesuai standar
4. TEST   → Cek type errors, pastikan RLS teraplikasi
5. REPORT → Ringkas apa yang dibuat dan dependensi yang mungkin perlu diperhatikan
```

---

## Environment Variables yang Dibutuhkan

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # hanya untuk Edge Functions

# Claude AI
ANTHROPIC_API_KEY=

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_SERVICE_ACCOUNT_KEY=    # untuk server-side FCM

# Email (Resend)
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
```

---

## Current Phase

Lihat `docs/ROADMAP.md` untuk fase aktif saat ini.  
Jangan kerjakan task dari fase yang belum dimulai kecuali diminta eksplisit.
