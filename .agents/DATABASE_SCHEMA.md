# DATABASE_SCHEMA.md

Semua tabel menggunakan PostgreSQL di Supabase dengan Row Level Security aktif.
Migration files ada di `supabase/migrations/`.

---

## Tabel Utama

### `profiles`
Extends `auth.users` — dibuat otomatis via trigger saat user signup.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | = auth.users.id |
| `full_name` | TEXT | Dari Google OAuth |
| `avatar_url` | TEXT | Foto profil Google |
| `currency` | TEXT | Default: `'IDR'` |
| `timezone` | TEXT | Default: `'Asia/Jakarta'` |
| `onboarded` | BOOLEAN | Sudah selesai onboarding? |
| `fcm_token` | TEXT | Token FCM untuk push notif |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | Auto-update via trigger |

---

### `wallets`
Akun keuangan user (kas, rekening, e-wallet, dll).

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `user_id` | UUID FK → profiles | |
| `name` | TEXT | "BCA Utama", "GoPay", dll |
| `type` | ENUM | `cash / bank / ewallet / investment / other` |
| `balance` | NUMERIC(15,2) | Saldo terkini (auto-update via trigger) |
| `currency` | TEXT | Default IDR |
| `color` | TEXT | Hex color untuk UI |
| `icon` | TEXT | Emoji icon |
| `is_active` | BOOLEAN | Soft delete |

> **Penting:** Jangan update `balance` secara manual. Balance dikelola otomatis oleh trigger `update_wallet_balance()` saat insert/update/delete di tabel `transactions`.

---

### `categories`
Kategori transaksi. Ada dua jenis:
- **Default** (`user_id IS NULL`) — seed data sistem, bisa dibaca semua user
- **Custom** (`user_id = user.id`) — kategori buatan user sendiri

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `user_id` | UUID FK → profiles | NULL = default sistem |
| `name` | TEXT | "Makan & Minum", "Transport" |
| `icon` | TEXT | Emoji |
| `color` | TEXT | Hex color |
| `type` | ENUM | `income / expense / transfer` |
| `is_default` | BOOLEAN | Apakah ini kategori sistem default? |

---

### `transactions`
Tabel utama pencatatan keuangan.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `user_id` | UUID FK → profiles | |
| `wallet_id` | UUID FK → wallets | |
| `category_id` | UUID FK → categories | Nullable |
| `receipt_id` | UUID FK → receipts | Ada jika dari scan struk |
| `recurring_id` | UUID FK → recurring_templates | Ada jika dari recurring |
| `amount` | NUMERIC(15,2) | Selalu positif |
| `type` | ENUM | `income / expense / transfer` |
| `description` | TEXT | Deskripsi singkat |
| `notes` | TEXT | Catatan tambahan |
| `transaction_date` | DATE | Tanggal transaksi (bukan created_at) |
| `is_recurring` | BOOLEAN | Apakah dari template recurring? |
| `tags` | TEXT[] | Array tag bebas |

---

### `receipts`
Hasil scan struk via AI.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `user_id` | UUID FK → profiles | |
| `image_url` | TEXT | URL di Supabase Storage |
| `raw_text` | TEXT | Raw text hasil OCR (jika ada) |
| `merchant_name` | TEXT | Hasil ekstraksi AI |
| `total_amount` | NUMERIC(15,2) | Total yang diekstrak AI |
| `receipt_date` | DATE | Tanggal di struk |
| `receipt_type` | ENUM | `purchase / payment / payslip / transfer / topup / bill / other` |
| `ai_extracted` | JSONB | Full response AI (items, confidence, dll) |
| `is_processed` | BOOLEAN | Sudah dijadikan transaksi? |

**Struktur `ai_extracted` JSONB:**
```json
{
  "confidence": 0.95,
  "merchant": "Indomaret",
  "address": "Jl. Sudirman No. 5",
  "date": "2024-01-15",
  "time": "14:32",
  "items": [
    { "name": "Indomie Goreng", "qty": 2, "price": 3500, "subtotal": 7000 }
  ],
  "subtotal": 45000,
  "tax": 4500,
  "total": 49500,
  "payment_method": "GoPay",
  "receipt_type": "purchase",
  "suggested_category": "Makan & Minum"
}
```

---

### `budgets`
Anggaran per kategori per bulan.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `user_id` | UUID FK → profiles | |
| `category_id` | UUID FK → categories | |
| `amount` | NUMERIC(15,2) | Batas anggaran |
| `month` | SMALLINT | 1–12 |
| `year` | SMALLINT | e.g. 2024 |
| **UNIQUE** | | `(user_id, category_id, month, year)` |

> **Query spent:** Hitung dari tabel `transactions` WHERE kategori + bulan + tahun sama. Tidak ada kolom `spent` di tabel ini (computed on-the-fly atau via view).

---

### `recurring_templates`
Template untuk transaksi berulang (cicilan, langganan).

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `user_id` | UUID FK → profiles | |
| `wallet_id` | UUID FK → wallets | |
| `category_id` | UUID FK → categories | |
| `name` | TEXT | "Cicilan KPR BCA", "Netflix" |
| `amount` | NUMERIC(15,2) | |
| `type` | ENUM | `income / expense` |
| `frequency` | ENUM | `daily / weekly / monthly / yearly` |
| `next_due_date` | DATE | Diupdate tiap kali diproses |
| `end_date` | DATE | Nullable — kapan berakhir |
| `is_active` | BOOLEAN | Bisa di-pause |

---

### `reminders`
Pengingat yang dikirim ke user.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `user_id` | UUID FK → profiles | |
| `title` | TEXT | "Bayar tagihan listrik" |
| `type` | ENUM | `saving / installment / subscription / bill / custom` |
| `amount` | NUMERIC(15,2) | Nullable |
| `due_date` | DATE | Tanggal jatuh tempo |
| `frequency` | ENUM | Nullable (sekali = null) |
| `next_remind` | TIMESTAMPTZ | Kapan reminder berikutnya dikirim |
| `is_active` | BOOLEAN | |
| `channels` | JSONB | `{ "push": true, "email": false, "inapp": true }` |

---

### `notifications`
Notifikasi in-app.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID PK | |
| `user_id` | UUID FK → profiles | |
| `title` | TEXT | |
| `body` | TEXT | |
| `type` | ENUM | `reminder / budget_alert / recurring / system / ai_insight` |
| `is_read` | BOOLEAN | |
| `action_url` | TEXT | Deep link di dalam app |
| `metadata` | JSONB | Data tambahan kontekstual |

---

## Views

### `monthly_summary`
```sql
SELECT user_id, year, month, type, SUM(amount) AS total
FROM transactions
GROUP BY user_id, year, month, type
```
Dipakai untuk dashboard summary cards dan laporan bulanan.

---

## Triggers

| Trigger | Event | Fungsi |
|---------|-------|--------|
| `trg_wallet_balance` | AFTER INSERT/UPDATE/DELETE ON transactions | Auto-update `wallets.balance` |
| `on_auth_user_created` | AFTER INSERT ON auth.users | Auto-create `profiles` row |
| `trg_*_updated_at` | BEFORE UPDATE | Auto-set `updated_at = NOW()` |

---

## Indexes

```sql
idx_transactions_user_date  -- (user_id, transaction_date DESC) — query utama
idx_transactions_wallet     -- (wallet_id)
idx_transactions_category   -- (category_id)
idx_budgets_user_period     -- (user_id, year, month)
idx_notifications_user      -- (user_id, is_read, created_at DESC)
idx_reminders_user          -- (user_id, is_active, due_date)
idx_recurring_due           -- (next_due_date) WHERE is_active = TRUE
```

---

## RLS Summary

Semua tabel: user hanya bisa akses `WHERE user_id = auth.uid()`.

**Pengecualian:**
- `categories`: user bisa baca `user_id IS NULL` (default sistem)
- `notifications`: Edge Function dengan service role bisa INSERT
- `categories` default: tidak bisa di-delete (protected by policy)
