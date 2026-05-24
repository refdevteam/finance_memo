# CODING_STANDARDS.md

Standar ini wajib diikuti untuk semua kode di project Fimo.

---

## TypeScript

```typescript
// ✅ Selalu definisikan return type untuk Server Actions
export async function createTransaction(
  data: TransactionFormData
): Promise<ActionResult<TransactionRow>> { ... }

// ✅ Gunakan type dari database.ts yang di-generate Supabase
import type { Database } from '@/types/database'
type TransactionRow = Database['public']['Tables']['transactions']['Row']
type TransactionInsert = Database['public']['Tables']['transactions']['Insert']

// ❌ Hindari any
const data: any = ... // JANGAN

// ✅ Gunakan unknown + type guard jika terpaksa
const data: unknown = ...
if (isTransaction(data)) { ... }
```

---

## Server Actions Pattern

Semua mutation dan query sensitif harus lewat Server Actions di `/actions/`:

```typescript
// actions/transactions.ts
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const transactionSchema = z.object({
  wallet_id: z.string().uuid(),
  category_id: z.string().uuid().optional(),
  amount: z.number().positive(),
  type: z.enum(['income', 'expense', 'transfer']),
  description: z.string().min(1).max(200),
  transaction_date: z.string().date(),
  tags: z.array(z.string()).optional().default([]),
})

export type TransactionFormData = z.infer<typeof transactionSchema>

type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }

export async function createTransaction(
  formData: TransactionFormData
): Promise<ActionResult<TransactionRow>> {
  const supabase = createServerClient()

  // 1. Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { data: null, error: 'Unauthorized' }

  // 2. Validasi input
  const parsed = transactionSchema.safeParse(formData)
  if (!parsed.success) {
    return { data: null, error: parsed.error.errors[0].message }
  }

  // 3. Query
  const { data, error } = await supabase
    .from('transactions')
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  // 4. Revalidate
  revalidatePath('/dashboard/transactions')
  revalidatePath('/dashboard')

  return { data, error: null }
}
```

---

## Komponen React

```typescript
// components/transactions/TrxForm.tsx

// ✅ Typed props interface
interface TrxFormProps {
  wallets: WalletRow[]
  categories: CategoryRow[]
  initialData?: Partial<TransactionFormData>
  onSuccess?: (trx: TransactionRow) => void
}

// ✅ 'use client' hanya jika butuh interaktivitas
'use client'

import { useTransition } from 'react'
import { createTransaction } from '@/actions/transactions'

export function TrxForm({ wallets, categories, initialData, onSuccess }: TrxFormProps) {
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (data: TransactionFormData) => {
    startTransition(async () => {
      const result = await createTransaction(data)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Transaksi berhasil disimpan')
      onSuccess?.(result.data)
    })
  }

  return ( ... )
}
```

---

## Supabase Query Best Practices

```typescript
// ✅ Selalu select kolom yang dibutuhkan saja
const { data } = await supabase
  .from('transactions')
  .select('id, amount, type, description, transaction_date, categories(name, icon, color)')
  .eq('user_id', user.id)
  .order('transaction_date', { ascending: false })
  .limit(20)

// ✅ Gunakan .single() untuk query yang harusnya return 1 row
const { data, error } = await supabase
  .from('wallets')
  .select('*')
  .eq('id', walletId)
  .eq('user_id', user.id)
  .single()

// ❌ Hindari select('*') di tabel besar tanpa limit
// ❌ Jangan lupa eq('user_id', user.id) — walaupun RLS sudah ada, ini defensive programming
```

---

## Error Handling

```typescript
// ✅ Selalu handle error Supabase
const { data, error } = await supabase.from('transactions').select()
if (error) {
  console.error('[getTransactions]', error)
  return { data: null, error: 'Gagal memuat transaksi' }
}

// ✅ Gunakan toast untuk user-facing error
import { toast } from 'sonner'
toast.error('Gagal menyimpan transaksi. Coba lagi.')

// ❌ Jangan throw error dari Server Action — return error object
```

---

## Folder & File Structure Rules

```
components/
  ├── ui/              # shadcn/ui components — JANGAN EDIT
  ├── layout/          # Komponen layout: Sidebar, Navbar, NotifCenter
  ├── dashboard/       # Komponen khusus halaman dashboard
  ├── transactions/    # Komponen khusus halaman transactions
  └── [feature]/       # Satu folder per feature/halaman

actions/
  ├── transactions.ts  # Satu file per domain/entity
  ├── budgets.ts
  ├── wallets.ts
  └── ...

lib/
  ├── supabase/        # Client setup saja
  ├── ai/              # AI utility functions
  └── utils/           # Helper functions (currency, date, export)
```

**Aturan file:**
- 1 komponen = 1 file
- Nama file = nama komponen (PascalCase.tsx)
- Maksimal 300 baris per file — jika lebih, pecah jadi komponen lebih kecil
- Semua export dari satu folder lewat `index.ts` barrel (opsional, jika sudah banyak file)

---

## Tailwind & Styling

```typescript
// ✅ Gunakan cn() utility untuk conditional classes
import { cn } from '@/lib/utils'

<div className={cn(
  'rounded-lg border p-4',
  isActive && 'border-primary bg-primary/5',
  isError && 'border-destructive'
)}>

// ✅ Gunakan CSS variables dari shadcn untuk warna semantik
// text-foreground, bg-background, text-muted-foreground, border, dll

// ❌ Jangan hardcode warna hex di className
<div className="text-[#1D9E75]"> // HINDARI — pakai variant shadcn
```

---

## Formatting Angka (IDR)

Selalu gunakan utility dari `lib/utils/currency.ts`:

```typescript
import { formatIDR, formatCurrency } from '@/lib/utils/currency'

formatIDR(150000)           // → "Rp 150.000"
formatIDR(1500000, true)    // → "Rp 1,5 jt" (compact)
formatCurrency(150, 'USD')  // → "US$ 150.00"
```

Jangan pernah format angka langsung di komponen tanpa utility.

---

## Commit Message Convention

```
feat: tambah fitur scan struk via AI
fix: perbaiki kalkulasi budget progress bulan ini
refactor: ekstrak currency utils ke lib/utils
docs: update DATABASE_SCHEMA untuk tabel receipts
chore: update dependensi shadcn/ui
```

Format: `<type>: <deskripsi singkat dalam bahasa Indonesia/Inggris>`
Types: `feat | fix | refactor | docs | chore | test | style`
