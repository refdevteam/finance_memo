# ARCHITECTURE.md

## Gambaran Arsitektur Sistem

```
Browser / PWA
     │
     ▼
Firebase App Hosting
┌─────────────────────────────────────────────┐
│  Next.js 14 (App Router + TypeScript)       │
│  ┌──────────┐ ┌──────────────┐ ┌─────────┐ │
│  │  Pages   │ │Server Actions│ │API Route│ │
│  │  + UI    │ │  /actions/*  │ │ /api/*  │ │
│  └──────────┘ └──────────────┘ └─────────┘ │
│         Middleware (auth guard)             │
└─────────────────────────────────────────────┘
     │              │                │
     ▼              ▼                ▼
Supabase      Claude AI API     Firebase FCM
(Auth + DB    (Receipt scan,    (Push notif)
 + Storage)    classify, insight)
     │
     ▼
PostgreSQL + RLS + Edge Functions
```

---

## Layer Breakdown

### 1. Presentation Layer (`app/` + `components/`)

**Route Groups:**
```
app/
├── auth/              # Login, OAuth callback (public)
│   ├── login/
│   └── callback/
└── dashboard/         # Protected routes (require auth)
    ├── layout.tsx     # Sidebar + auth check
    ├── dashboard/     # Home dashboard
    ├── transactions/  # List + detail + add
    ├── budgets/       # Budget per kategori
    ├── wallets/       # Manajemen wallet
    ├── reminders/     # Reminder management
    ├── reports/       # Laporan + export
    └── settings/      # Profil + preferensi
```

**Middleware (`middleware.ts`):**
- Cek Supabase session di setiap request
- Redirect `/dashboard/*` ke `/auth/login` jika tidak terautentikasi
- Refresh session token otomatis

### 2. Data Access Layer (`actions/` + `lib/supabase/`)

Semua operasi database **wajib** lewat Server Actions. Tidak ada query Supabase dari client component.

```typescript
// Pattern wajib untuk semua Server Action
'use server'

export async function createTransaction(data: TransactionFormData) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const parsed = transactionSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }

  const { data: trx, error } = await supabase
    .from('transactions')
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data: trx }
}
```

**Supabase Client Files:**
- `lib/supabase/client.ts` — browser client (untuk realtime subscription)
- `lib/supabase/server.ts` — server client (untuk Server Actions + API Routes)
- `lib/supabase/middleware.ts` — middleware client (untuk session refresh)

### 3. AI Layer (`lib/ai/` + `app/api/ai/`)

```
User upload foto struk
         │
         ▼
POST /api/ai/scan-receipt
         │
         ▼
lib/ai/scan-receipt.ts
  → Convert image to base64
  → Send ke Claude API (claude-sonnet-4-20250514) dengan vision
  → Parse response JSON
  → Return: { merchant, amount, date, items, type, confidence }
         │
         ▼
Client: tampilkan preview hasil AI
         │
   User konfirmasi / edit
         │
         ▼
Server Action: createTransaction (simpan ke DB)
```

**Prompt template di `lib/ai/prompts.ts`** — semua prompt AI terpusat di sini.

### 4. Notification Layer

**Push Notification (FCM):**
```
Supabase Edge Function (cron: tiap jam)
  → Query reminders WHERE next_remind <= NOW()
  → POST ke FCM API dengan fcm_token dari profiles
  → Insert ke notifications table
  → Update next_remind
```

**Email (Resend):**
```
Supabase Edge Function
  → Query reminders dengan channel email = true
  → Send via Resend API
  → Log di notifications
```

**In-app Notification:**
```
Supabase Realtime subscription
  → Client subscribe ke notifications WHERE user_id = current_user
  → Tampil di NotifCenter component (bell icon di navbar)
```

### 5. Scheduled Jobs (Supabase Edge Functions)

| Function | Schedule | Tugas |
|----------|----------|-------|
| `send-reminder` | Setiap jam | Kirim push/email reminder yang jatuh tempo |
| `process-recurring` | Setiap hari pukul 00:05 WIB | Buat transaksi dari recurring_templates yang due |
| `budget-alert` | Setiap hari pukul 08:00 WIB | Cek budget yang hampir habis, kirim notif |

---

## Data Flow: Tambah Transaksi Manual

```
1. User isi form di TrxForm.tsx
2. Client: validasi basic (required fields)
3. Submit → Server Action: createTransaction()
4. Server Action: validasi Zod schema
5. Server Action: getUser() — pastikan session valid
6. Insert ke transactions table (RLS otomatis filter user_id)
7. Trigger: update_wallet_balance() otomatis update saldo wallet
8. Return: { data: transaction }
9. Client: revalidatePath('/dashboard/transactions')
10. UI update otomatis
```

## Data Flow: Scan Struk

```
1. User upload foto di ReceiptScanner.tsx
2. Client: preview foto, tombol "Scan"
3. POST /api/ai/scan-receipt (FormData dengan image)
4. Server: upload image ke Supabase Storage
5. Server: kirim ke Claude API (base64 image + prompt)
6. Claude return JSON: { merchant, amount, date, type, items[] }
7. Server: simpan ke receipts table (is_processed: false)
8. Return hasil ke client
9. Client: auto-fill TrxForm dengan data AI
10. User review + konfirmasi
11. Server Action: createTransaction() + update receipts.is_processed = true
```

---

## Keamanan

- **RLS di semua tabel** — user hanya bisa akses data miliknya sendiri
- **Server Actions** — tidak ada business logic di client, tidak ada API key exposed
- **Zod validation** — semua input divalidasi di server sebelum masuk DB
- **Auth middleware** — semua route `/dashboard/*` dilindungi session check
- **Service role key** — hanya dipakai di Edge Functions, tidak pernah ke client
- **Storage bucket** — private bucket, akses via signed URL yang expire
