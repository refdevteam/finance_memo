# Plan: Split Bill — Share ke Teman (Notifikasi + Read-Only View)

Tanggal: 01-10-2026
Status: DIIMPLEMENTASIKAN (01-10-2026) — lint lolos; migration dibuat sebagai file BARU `20261001103125_v2_split_bill_share.sql` (berlaku apakah migration V1 sudah/belum di-apply).

## Keputusan desain (sudah dikonfirmasi)

1. **Read-only share** — tidak ada duplikasi row. Teman MEMBACA `split_bills` yang
   berisi namanya (via RPC `SECURITY DEFINER`, bukan policy silang — alasan di
   "Risiko teknis"). Status tetap satu sumber kebenaran: pembayar yang menandai lunas.
2. **Belum ada transaksi di dompet teman** — teman hanya melihat tagihan + status.
   Pemasukan tetap dicatat di dompet pembayar (perilaku V1 tidak berubah).
3. **In-app + push FCM** — insert row `notifications` dari sesi pembayar
   (RLS INSERT sudah `WITH CHECK (TRUE)`), lalu panggil Edge Function
   `send-fcm-notification` dengan `save_to_db: false` (hanya push).

## Temuan riset (dasar desain)

- `notifications` punya `action_url` + realtime INSERT → toast & link "Lihat" sudah
  ditangani `NotificationCenter.tsx:124-127,149-161`. Deep link aman.
- Tidak ada `createNotification` di app — insert notifikasi selama ini via RPC SQL /
  Edge Function. Kita buat helper internal (non-export) di `split-bills.ts`.
- Enum `notif_type` belum punya nilai split → perlu `ALTER TYPE ... ADD VALUE`.
- RLS `notifications` INSERT `WITH CHECK (TRUE)` (`.agents/002_rls.sql:99-100`) →
  pembayar bisa insert notifikasi ke akun teman, tanpa service-role.
- Edge Function `send-fcm-notification` menerima `{user_id, title, body, type,
  action_url, data, save_to_db}`; default `save_to_db=true` → kita kirim `false`
  supaya tidak dobel insert (`supabase/functions/send-fcm-notification/index.ts:51-61`).
- Tidak ada service-role client di Next.js → `functions.invoke` memakai sesi user
  (verify_jwt lolos karena pembayar terautentikasi). Wajib try/catch (push = best effort).
- `profiles` RLS hanya SELECT own → teman tidak bisa join nama pembayar via
  foreign table → nama pembayar diambil di dalam RPC (SECURITY DEFINER).

## Risiko teknis: kenapa RPC, bukan policy silang

Policy baru `split_bills FOR SELECT USING (EXISTS ... split_bill_shares)` + policy
shares yang `EXISTS ... split_bills` (policy owner yang sudah ada) → saling
mereferensi → PostgreSQL error `infinite recursion detected in policy`.
Solusi: **tidak menambah policy apa pun**. Teman membaca lewat fungsi
`SECURITY DEFINER` yang sudah difilter (`partner_user_id = auth_uid()`), sehingga:

- tanpa rekursi RLS,
- kolom `profiles` sensitif (fcm_token) tidak ikut terekspos,
- teman tetap tidak bisa UPDATE/DELETE/melihat transaksi pembayar
  (RLS `transactions: all own` tetap berlaku; `transaction_id` hanya UUID).

## Perubahan file

### 1. `supabase/migrations/20260930160000_v2_split_bill.sql` (EDIT in-place)

> Asumsi: migration ini **belum di-apply** (belum ada jawaban soal `db push`).
> Jika ternyata sudah di-apply, perubahan dipindah ke file migration baru —
> konfirmasi dulu sebelum eksekusi.

Ditambahkan di akhir file:

- `ALTER TYPE notif_type ADD VALUE IF NOT EXISTS 'split_bill';`
  (PG15 aman dalam transaksi **asal nilai tidak dipakai dalam transaksi yang sama** —
  kita tidak insert di migration ini).
- Fungsi:
  ```sql
  CREATE OR REPLACE FUNCTION public.bills_shared_with_me()
  RETURNS TABLE (
    id uuid, title text, amount numeric, split_method text, status text,
    notes text, created_at timestamptz,
    payer_id uuid, payer_name text, payer_avatar text,
    my_share_amount numeric, my_share_status text
  )
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT b.id, b.title, b.amount, b.split_method, b.status, b.notes, b.created_at,
           b.user_id, pr.full_name, pr.avatar_url,
           s.amount, s.status
    FROM split_bills b
    JOIN split_bill_shares s
      ON s.split_bill_id = b.id AND s.partner_user_id = auth_uid()
    JOIN profiles pr ON pr.id = b.user_id
    WHERE b.user_id <> auth_uid()
    ORDER BY b.created_at DESC;
  $$;
  REVOKE ALL ON FUNCTION public.bills_shared_with_me() FROM PUBLIC, anon;
  GRANT EXECUTE ON FUNCTION public.bills_shared_with_me() TO authenticated;
  ```

### 2. `src/actions/split-bills.ts`

Helper non-export:

```ts
async function notifyPartner(
  supabase, targetUserId, title, body, actionUrl, metadata
)
```

- `supabase.from('notifications').insert({ user_id: targetUserId, title, body,
  type: 'split_bill', action_url, metadata })` — gagal → log saja (non-fatal).
- Fire-and-forget `supabase.functions.invoke('send-fcm-notification', { body:
  { user_id, title, body, type: 'split_bill', action_url, data: metadata,
  save_to_db: false } })` dalam try/catch.
- Lewati jika `targetUserId == null` atau `== payer.id` (partner manual / diri sendiri).

Dipanggil di:

| Aksi | Notifikasi ke teman |
|---|---|
| `createSplitBill` (per share yang punya `partner_user_id`, **setelah** insert sukses) | "Anda diajak patungan 'Judul' — Rp 150.000. Bagianmu: Rp 75.000." → `/dashboard/split-bills?shared=1` |
| `markSharePaid` (jika `record_income` atau tidak — selalu) | "Budi menandai bagianmu lunas — 'Judul'." → `/dashboard/split-bills?shared=1` |
| `deleteSplitBill` (per share partner yang punya `partner_user_id`) | "Budi membatalkan patungan 'Judul'." → `/dashboard/split-bills` |

`metadata`: `{ split_bill_id, share_id?, amount? }`.

### 3. `src/types/database.ts`

Union type notifikasi (baris ~146) += `'split_bill'`.

### 4. `src/components/layout/NotificationCenter.tsx`

- Union type `:36` += `'split_bill'`.
- `getNotificationIcon` += `case 'split_bill': return Users` (import dari lucide).

### 5. `src/components/split/types.ts`

```ts
export interface SharedBill {
  id: string
  title: string
  amount: number
  split_method: 'equal' | 'custom'
  status: 'open' | 'settled'
  notes: string | null
  created_at: string
  payer_id: string
  payer_name: string | null
  payer_avatar: string | null
  my_share_amount: number
  my_share_status: 'pending' | 'paid'
}
```

### 6. `src/app/dashboard/split-bills/page.tsx`

- Query tambahan: `supabase.rpc('bills_shared_with_me')` → `sharedBills`
  (cast ke `SharedBill[]`).
- Pass prop `sharedBills` ke `SplitBillsClient`.

### 7. `src/components/split/SplitBillsClient.tsx`

- Prop baru `sharedBills: SharedBill[]`.
- Section baru **"Tagihan dari Teman"** (di atas list "Patungan saya"):
  card berisi avatar+nama pembayar, judul, **bagianmu Rp X**, status
  (badge `Menunggu` / `Sudah dibayar`), tanggal. Read-only — tanpa tombol aksi
  (tombol "Saya sudah bayar" = opsi yang ditolak, transaksi tetap manual).
- Highlight jika `searchParams.shared === '1'` (mis. scroll/outline sebentar).

## Urutan eksekusi

1. Edit migration (enum + RPC + grant).
2. `types/database.ts` + `NotificationCenter.tsx` (union & icon).
3. `split/types.ts` (SharedBill).
4. `split-bills.ts` (helper notify + 3 panggilan).
5. `page.tsx` (rpc) + `SplitBillsClient` (section).
6. `npm run lint` (dilarang `tsc`/`next build` per `.agents/AGENTS.md`).

## Verifikasi manual (butuh migration di-apply + 2 akun)

- [ ] `ALTER TYPE` berhasil; insert notifikasi type `split_bill` tidak error.
- [ ] Akun A buat patungan dengan partner dari QR (akun B) →
      B dapat notifikasi in-app (toast realtime) + push (jika device B punya token FCM).
- [ ] B buka `/dashboard/split-bills` → section "Tagihan dari Teman" menampilkan
      tagihan dari A dengan bagianmu benar; tidak ada transaksi masuk dompet B.
- [ ] Klik notifikasi di B → landing di `/dashboard/split-bills?shared=1`.
- [ ] A tandai lunas → B (buka app) dapat notifikasi + status berubah sinkron.
- [ ] A hapus patungan → B dapat notifikasi pembatalan, tagihan hilang dari list B.
- [ ] Teman manual (`partner_user_id` NULL) → tidak ada error, tidak ada notifikasi.
- [ ] B tidak bisa membaca transaksi/dompet A (cek: `transaction_id` tidak membuka
      detail; RPC tidak mengembalikan kolom dompet/kategori).

## Di luar scope (backlog)

- Tombol "Saya sudah bayar" dari sisi teman (expense di dompet teman + balik notifikasi).
- Notifikasi otomatis saat A menambah/mengubah teman lama di tagihan (saat ini hanya
  share yang ada saat `createSplitBill`).
- Halaman detail per-bagian untuk teman (sekarang card saja).
