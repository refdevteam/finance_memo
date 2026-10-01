# PLAN — Fitur Split Bill (Patungan) dengan QR Fimo

**Tanggal:** 30-09-2026
**Status:** Siap dieksekusi (keputusan desain sudah dikonfirmasi)
**Referensi internal:** `.agents/ROADMAP_v2.md` (Phase 2 — Split-Bill & Kolaborasi), `.agents/DESIGN.md`

---

## 1. Keputusan Desain (Terkonfirmasi)

| Aspek | Keputusan |
|---|---|
| Identitas teman | **QR Fimo** (berisi `user_id` + nama + avatar) + fallback **tambah manual** |
| Pencatatan | **1 transaksi expense penuh** (dompet kamu) + tabel split (piutang per teman) |
| V1 scope | Menu + riwayat split, status bayar & tandai lunas, **QR Saya**, tombol **Bagi Tagihan** setelah AI scan struk |
| Metode scan | **Live camera** (getUserMedia + jsQR) + fallback foto/galeri |
| Alur pilih teman | **Cek list `last_bill_partners` dulu → scan QR hanya kalau belum ada** (scan teman yang sudah ada → auto-centang + toast) |
| Nominal split dari struk | **Ya** — alur "Bagi Tagihan" mengambil `total_amount` hasil AI scan (judul, tanggal, kategori juga ter-prefill) |

**Dua entry point split:**
1. **Dari scan struk** — tombol "Bagi Tagihan" di state hasil scan → form split ter-prefill.
2. **Manual** — dari menu Split Bill (nominal diisi sendiri).

---

## 2. Brainstorm UX (Riset Kompetitor)

- **Splitwise/Tricount**: flow berurutan *detail → peserta → metode split → simpan*; split rata/nominal/persen; kalkulasi real-time; sisa bagian selalu tampil; pola *recent contacts* untuk mengulang peserta tanpa input ulang.
- **GoPay/DANA (Indonesia)**: bottom sheet, peserta via QR/kontak, rata vs kustom, status *belum bayar/sudah bayar*, riwayat tagihan, net amount (banyak transaksi bilateral tidak ditampilkan).
- **Standar 2026**: fewer taps, progressive disclosure (metode split lanjutan disembunyikan), validasi `sum(shares) ≤ total` inline, sticky CTA, confirmation state.
- **Adaptasi Fimo**: app single-user (bukan ledger kolaboratif) → split = **menagih teman (piutang)**, bukan shared balance. UI mengikuti pola neo-brutalist yang ada (`border-2 border-black`, shadow offset, `InlineSelect` di dalam Dialog, list-row seperti `TransactionListClient`).

---

## 3. Database — Migration Baru

**File:** `supabase/migrations/20260930160000_v2_split_bill.sql`

```sql
-- 3.1 Teman bayar (kontak via QR, pengganti akses kontak HP)
CREATE TABLE last_bill_partners (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partner_user_id UUID,                    -- dari QR Fimo (NULL untuk input manual)
  name            TEXT NOT NULL,
  avatar_url      TEXT,
  source          TEXT NOT NULL DEFAULT 'qr' CHECK (source IN ('qr','manual')),
  last_used_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_last_bill_partner_user
  ON last_bill_partners(user_id, partner_user_id)
  WHERE partner_user_id IS NOT NULL;
CREATE INDEX idx_last_bill_partners_user_used
  ON last_bill_partners(user_id, last_used_at DESC);

-- 3.2 Tagihan patungan (1 transaksi expense di-transactions, FK di sini)
CREATE TABLE split_bills (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  amount         NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  split_method   TEXT NOT NULL DEFAULT 'equal' CHECK (split_method IN ('equal','custom')),
  status         TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','settled')),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_split_bills_user_created ON split_bills(user_id, created_at DESC);

-- 3.3 Bagian per teman (piutang)
CREATE TABLE split_bill_shares (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  split_bill_id       UUID NOT NULL REFERENCES split_bills(id) ON DELETE CASCADE,
  partner_id          UUID REFERENCES last_bill_partners(id) ON DELETE SET NULL,
  partner_user_id     UUID,               -- snapshot dari partner/QR
  name                TEXT NOT NULL,      -- snapshot nama saat split dibuat
  avatar_url          TEXT,
  amount              NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  paid_at             TIMESTAMPTZ,
  paid_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_split_shares_bill ON split_bill_shares(split_bill_id);
CREATE INDEX idx_split_shares_partner ON split_bill_shares(partner_id);
```

**RLS** (ikuti gaya `.agents/002_rls.sql`, helper `auth_uid()`):

```sql
ALTER TABLE last_bill_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE split_bills         ENABLE ROW LEVEL SECURITY;
ALTER TABLE split_bill_shares   ENABLE ROW LEVEL SECURITY;

-- last_bill_partners & split_bills: milik sendiri saja
CREATE POLICY ... FOR ALL USING (user_id = auth_uid()) WITH CHECK (user_id = auth_uid());

-- split_bill_shares: lewat pemilik split_bills
CREATE POLICY ... FOR ALL USING (
  EXISTS (SELECT 1 FROM split_bills sb WHERE sb.id = split_bill_shares.split_bill_id AND sb.user_id = auth_uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM split_bills sb WHERE sb.id = split_bill_shares.split_bill_id AND sb.user_id = auth_uid())
);
```

**Catatan penting:**
- Saldo wallet **tidak ditulis aplikasi** — trigger `trg_wallet_balance` yang menangani (expense penuh saat buat split; income saat "tandai lunas + catat pemasukan").
- `split_bills.status` dihitung ulang dari shares: `settled` saat semua share `paid`.
- `ON DELETE CASCADE` dari `split_bills.transaction_id` → hapus transaksi = hapus split + shares otomatis.
- **Update `src/types/database.ts`**: tambah Row/Insert/Update untuk 3 tabel baru.

---

## 4. Server Actions — `src/actions/split-bills.ts` (BARU)

Mengikuti pola `src/actions/transactions.ts` (`'use server'` → `createClient()` → auth guard → zod → `revalidatePath` → `{ success, error }`):

| Action | Fungsi |
|---|---|
| `createSplitBill(input)` | Validasi `Σ shares ≤ amount`, `≥1` peserta, setiap share `> 0`. Insert **transaksi expense** (dengan `receipt_id` jika dari scan) → `split_bills` → batch `split_bill_shares` → update `last_used_at` partner. |
| `markSharePaid(shareId, { record_income?, wallet_id? })` | Set share `paid` + `paid_at`; opsional insert transaksi **income** (simpan `paid_transaction_id`); rekap ulang status split. |
| `unmarkSharePaid(shareId)` | Batalkan lunas (hapus income txn terkait, kembali `pending`). |
| `deleteSplitBill(id)` | Hapus split (cascade shares) + expense txn. **Income hasil pelunasan dipertahankan** (uang memang sudah masuk). |
| `addPartner({ name, partner_user_id?, avatar_url?, source })` | Simpan ke `last_bill_partners`, dedupe via unique partial index (return partner existing bila sudah ada). |
| `renamePartner(id, name)` / `deletePartner(id)` | Kelola daftar teman. |

**Schema zod inti:**

```ts
const splitBillSchema = z.object({
  title: z.string().min(1, "Judul wajib diisi"),
  amount: z.coerce.number().min(1, "Jumlah harus lebih dari 0"),
  wallet_id: z.string().uuid("Dompet harus dipilih"),
  category_id: z.string().uuid("Kategori harus dipilih"),
  transaction_date: z.string().min(1, "Tanggal wajib diisi"),
  receipt_id: z.string().uuid().optional(),        // dari AI scan
  split_method: z.enum(['equal', 'custom']),
  shares: z.array(z.object({
    partner_id: z.string().uuid().optional(),
    partner_user_id: z.string().uuid().optional(),
    name: z.string().min(1),
    avatar_url: z.string().nullable().optional(),
    amount: z.coerce.number().min(1),
  })).min(1, "Pilih minimal satu teman"),
})
// + superRefine: Σ shares.amount <= amount
```

**Revalidate:** `/dashboard/split-bills`, `/dashboard/transactions`, `/dashboard`.

---

## 5. UI/UX — Route `/dashboard/split-bills`

### 5.1 Halaman (server component, `export const dynamic = 'force-dynamic'`)

Pola sama dengan `src/app/dashboard/transactions/page.tsx`: auth guard → fetch.

- Fetch: `split_bills` + embed `split_bill_shares`, `last_bill_partners` (order `last_used_at DESC`), ringkasan (Σ share `pending`), wallets & categories.
- Tabs link seperti `transactions/page.tsx:82-95`: **Patungan** | **Teman Bayar**.

### 5.2 Tab "Patungan" (riwayat)

- **Kartu ringkasan**: Total Piutang (Σ share pending) + progres "x/y tagihan lunas".
- **CTA "Buat Split Baru"** → dialog 4 langkah + stepper (pattern Splitwise):
  1. **Detail** — Judul, Jumlah (Rp), Dompet (`InlineSelect`), Kategori, Tanggal.
  2. **Teman** — **list `last_bill_partners` dulu** (checkbox + avatar + "terakhir dipakai" + search) → tombol **Scan QR** & **Tambah manual** hanya untuk menambah yang belum ada. Hasil scan: sudah ada → auto-select + toast "Sudah ada di daftar"; belum → form konfirmasi nama (**editable**) → `addPartner` + select.
  3. **Pembagian** — toggle **Rata / Nominal manual**:
     - *Rata*: `floor(total / (n+1))` per teman, **bagianmu = sisa** (selalu tampil).
     - *Manual*: input per teman + indikator live **"Sisa bagianmu RpX"** — blokir simpan bila `Σ > total`.
  4. **Konfirmasi** — ringkasan + sticky **Simpan Split**.
- **Daftar split**: kartu (judul, tanggal, total, progress bar bayar, chip status) → klik → **Dialog detail**:
  - Baris per teman: avatar, nama, nominal, chip `Belum Bayar`/`Sudah Bayar`.
  - **Tandai Lunas** → confirm kecil dengan toggle **"Catat sebagai pemasukan"** + pilih dompet (default dompet utama).
  - **Batalkan lunas**, **Hapus split** (AlertDialog, pola `TransactionListClient`).
- Empty state + CTA.

### 5.3 Tab "Teman Bayar"

- List `last_bill_partners` (rename via inline edit, hapus via AlertDialog).
- **Kartu "QR Saya"**: render QR (`qrcode.react`) berisi payload:

  ```json
  {"v":1,"t":"fimo_user","id":"<uuid>","name":"<profiles.full_name>","avatar":"<avatar_url>"}
  ```

  - Tombol **Bagikan** → `navigator.share()` (fallback: salin payload ke clipboard).
  - Nama tampilan diambil dari `profiles.full_name` (bukan input terpisah, hindari duplikasi sumber).

### 5.4 Komponen baru — `src/components/split/`

| File | Fungsi |
|---|---|
| `SplitBillForm.tsx` | Dialog stepper 4 langkah, state bersama, terima **prefill props** (dari scan/manual). |
| `PartnerPicker.tsx` | List partner dulu + search + tombol Scan QR + tambah manual. |
| `QrScannerSheet.tsx` | Live `<video>` getUserMedia + decode loop `jsQR` (rAF + canvas), overlay frame; **cleanup track saat close**; gagal izin/unsupported → fallback card "Ambil Foto"/"Pilih Galeri" (pola `ReceiptScanner.tsx:227-254`). Payload bukan QR Fimo → toast error + opsi "Tambah manual". |
| `MyQrCode.tsx` | QR "Saya" + share/copy. |
| `SplitBillListClient.tsx` | Daftar + ringkasan + empty state. |
| `SplitBillDetail.tsx` | Dialog detail per-teman + aksi lunas/hapus. |

---

## 6. Integrasi dengan AI Scan Struk (NOMINAL DARI STRUK)

**Konfirmasi: ya — nominal split diambil dari struk yang sedang discan.**

### 6.1 Data yang ter-prefill (dari hasil scan `route.ts:165-168`)

| Field split | Sumber hasil scan |
|---|---|
| `amount` | `total_amount` (**bisa diedit** user, mis. patungan sebagian) |
| `title` | `merchant_name` |
| `transaction_date` | `receipt_date` (fallback: hari ini bila `null`) |
| `category_id` | auto-match `suggested_category_name` (pola `ReceiptScanner.tsx:110-117`) |
| `receipt_id` | `receipt_id` dari response API |

**Fallback:** scan menghasilkan `total_amount = 0` → step 1 tetap terbuka, nominal kosong + toast *"Total tidak terbaca, isi manual"*.

### 6.2 Mekanisme navigasi (tanpa state lifting antar sheet)

`ReceiptScanner.tsx` (state hasil scan) → tombol sekunder **"Bagi Tagihan"** (outline, ikon `Users`) di samping "Simpan Transaksi":

```ts
router.push(`/dashboard/split-bills?new=1&amount=${amt}&title=${encTitle}&date=${date}&receipt_id=${rid}`)
```

Halaman `split-bills` membaca `searchParams` → auto-buka `SplitBillForm` dengan prefill → step 1 terisi, lanjut step 2 (teman) → 3 → 4.

### 6.3 Poin detail wajib

1. **`createSplitBill` menerima `receipt_id`** → kolom `transactions.receipt_id` (sudah ada di schema) diisi, struk ↔ split saling terhubung.
2. **`markReceiptProcessed(receipt_id)` dipanggil HANYA setelah split disimpan** — cek agar tidak dobel dengan alur "Simpan Transaksi" biasa (`ReceiptScanner.tsx:141-145`); `is_processed` hanya boleh `true` sekali.
3. **Dua entry point tetap berjalan**: dari scan struk (prefill) **dan** manual dari menu (nominal diisi sendiri).
4. **Scope OCR**: saat ini AI hanya mengekstrak `total_amount` — **tidak ada rincian per-item** (`route.ts:95-103`), jadi pembagian berdasarkan **total tagihan**. Split per-item (assign item ke orang) butuh penambahan field `items` ke prompt AI → **backlog opsional, bukan V1**.

---

## 7. Registrasi Menu — `src/components/layout/Sidebar.tsx`

1. **Desktop** — `menuItems` (line 41) tambah:
   ```ts
   { icon: Users, label: 'Split Bill', href: '/dashboard/split-bills' },
   ```
2. **Mobile "Fimo Menu" sheet** (line 288-337) — tambah `<Link href="/dashboard/split-bills">` (ikon `Users`, urutan setelah Transaksi/logika sebelum Pengaturan).
3. **FAB add-sheet "Catat Keuangan Baru"** (line 251-255) — tambah baris **"Bagi Tagihan"** → `<Link href="/dashboard/split-bills?new=1">` bergaya seperti baris `TransactionForm`/`TransferForm`.
4. **Badge di daftar transaksi** (murah): `transactions/page.tsx` query kedua `split_bills (transaction_id, status)` → pass map → chip **"Patungan"** di `TransactionListClient` (sebelah deskripsi).

---

## 8. Dependensi & Konfigurasi

- `npm i jsqr qrcode.react`
- `next.config.mjs:54`:
  ```js
  // dari: camera=(), microphone=(), geolocation=()
  value: "camera=(self), microphone=(), geolocation=()"
  ```
  **Wajib** untuk live camera; CSP `img-src` sudah menyertakan `data:` (aman untuk QR). **Restart dev server** setelah ubah.
- Cara penerapan migration ke Supabase (`supabase db push` vs SQL manual) → **konfirmasi saat eksekusi** (repo ini punya riwayat drift schema).

---

## 9. Urutan Implementasi

1. Migration SQL + update `src/types/database.ts`
2. `src/actions/split-bills.ts`
3. Install deps + ubah `next.config.mjs`
4. `QrScannerSheet.tsx` + `MyQrCode.tsx`
5. `SplitBillForm.tsx` (stepper) + `PartnerPicker.tsx`
6. Halaman `/dashboard/split-bills` + `SplitBillListClient` + `SplitBillDetail` + tab teman
7. `Sidebar.tsx` (desktop + mobile menu + FAB sheet)
8. Integrasi `ReceiptScanner.tsx` ("Bagi Tagihan") + badge transaksi
9. Verifikasi

---

## 10. Verifikasi

- `npm run lint` (per `.agents/AGENTS.md`: **dilarang** `tsc`/`next build` kecuali diminta user).
- Checklist uji manual:
  - [ ] Live camera scan QR Fimo → partner masuk `last_bill_partners`
  - [ ] Scan ulang teman sama → auto-centang, **tidak duplikat**
  - [ ] Scan QR non-Fimo → error + fallback tambah manual
  - [ ] Split dari struk: nominal/judul/tanggal/kategori ter-prefill; `receipt_id` terhubung; `receipts.is_processed` tidak dobel
  - [ ] Split rata: `Σ teman + bagianmu = total`; validasi `Σ > total` diblokir
  - [ ] Tandai lunas dengan "catat pemasukan" → saldo wallet naik (trigger), share `paid`, split `settled` saat semua lunas
  - [ ] Hapus split → expense hilang, income pelunasan tetap
  - [ ] RLS: user lain tidak bisa baca `split_bills`/`shares`/`last_bill_partners` (uji SQL dengan 2 akun)
  - [ ] Menu tampil di desktop sidebar, mobile Menu sheet, dan FAB sheet
  - [ ] Responsive 375px–1280px, dark mode OK

---

## 11. Di Luar Scope V1 (Backlog)

- Notifikasi realtime antar akun Fimo (Supabase Realtime + FCM) — ROADMAP Minggu 5
- Tabel `groups` / `group_members` / `group_expenses` (kolaborasi multi-akun) — ROADMAP Minggu 4
- Buku besar utang + algoritma *simplified debt* + Settle Up terpusat — ROADMAP Minggu 6
- Split persen / shares, split per-item struk (butuh ekstensi prompt AI)

---

## 12. Daftar File Terdampak

| Aksi | File |
|---|---|
| NEW | `supabase/migrations/20260930160000_v2_split_bill.sql` |
| NEW | `src/actions/split-bills.ts` |
| NEW | `src/app/dashboard/split-bills/page.tsx` (+ `loading.tsx`) |
| NEW | `src/components/split/{SplitBillForm,PartnerPicker,QrScannerSheet,MyQrCode,SplitBillListClient,SplitBillDetail}.tsx` |
| MODIFY | `src/types/database.ts` (3 tabel baru) |
| MODIFY | `src/components/layout/Sidebar.tsx` (menuItems, Fimo Menu sheet, FAB sheet) |
| MODIFY | `src/components/transactions/ReceiptScanner.tsx` (tombol "Bagi Tagihan") |
| MODIFY | `src/app/dashboard/transactions/page.tsx` + `src/components/transactions/TransactionListClient.tsx` (badge Patungan) |
| MODIFY | `next.config.mjs` (Permissions-Policy camera) |
| DEPS | `jsqr`, `qrcode.react` |
