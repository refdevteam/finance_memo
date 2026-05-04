# WORKFLOW.md

Panduan operasional agent dalam mengerjakan task Fimo di Antigravity.

---

## Cara Memulai Sesi Baru

Setiap sesi baru, agent wajib:

```
1. Baca AGENT.md (file ini sudah otomatis dibaca Antigravity)
2. Baca docs/PROJECT_OVERVIEW.md untuk refresh konteks
3. Tanya: "Task apa yang ingin dikerjakan?" jika tidak ada instruksi eksplisit
4. Cek docs/ROADMAP.md — pastikan task ada di phase yang aktif
```

---

## Workflow per Task

### Step 1: ANALISIS
```
- Baca deskripsi task dengan teliti
- Identifikasi: fitur mana? (lihat FEATURES.md)
- Identifikasi: tabel mana yang terlibat? (lihat DATABASE_SCHEMA.md)
- Identifikasi: file mana yang perlu dibuat/diubah?
- Ada dependensi yang belum selesai? → report dulu, jangan lanjut
```

### Step 2: RENCANA
```
- Buat daftar file yang akan dibuat/diubah
- Tentukan urutan implementasi (bottom-up: types → actions → components → page)
- Jika ada perubahan schema DB → buat migration file baru
- Sampaikan rencana ke user jika task kompleks (>3 file)
```

### Step 3: IMPLEMENTASI
```
Urutan yang disarankan:
1. Types (jika ada type baru di types/app.ts)
2. Zod schema (validasi di actions/)
3. Server Action (actions/*.ts)
4. Server Component / Page (app/dashboard/*/page.tsx)
5. Client Components (components/**/*.tsx)
6. Hooks (hooks/*.ts) — jika butuh state management
7. Update index exports (jika ada)
```

### Step 4: VERIFIKASI
```
Checklist sebelum menyatakan task selesai:
[ ] TypeScript tidak ada error (perhatikan return types)
[ ] Zod validation ada di semua Server Action yang menerima input
[ ] Auth check ada di semua Server Action (getUser() di awal)
[ ] RLS sudah dipertimbangkan (user_id di setiap query)
[ ] Error state ditangani — return { data: null, error: '...' }
[ ] Loading state ada di komponen (isPending dari useTransition)
[ ] revalidatePath dipanggil setelah mutation
[ ] Tidak ada hardcoded string (currency, url, dll)
```

### Step 5: LAPORAN
```
Setelah selesai, report:
- File yang dibuat/diubah
- Cara test fitur ini
- Hal yang mungkin perlu perhatian (edge case, future consideration)
- Apakah ada task terkait yang disarankan dikerjakan berikutnya
```

---

## Pola Umum yang Sering Dipakai

### Pola 1: Fetch data di Server Component

```typescript
// app/dashboard/wallets/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WalletList } from '@/components/wallets/WalletList'

export default async function WalletsPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: wallets } = await supabase
    .from('wallets')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  return <WalletList wallets={wallets ?? []} />
}
```

### Pola 2: Mutation dari Client Component

```typescript
// components/wallets/WalletForm.tsx
'use client'
import { useTransition } from 'react'
import { createWallet } from '@/actions/wallets'
import { toast } from 'sonner'

export function WalletForm() {
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (data: WalletFormData) => {
    startTransition(async () => {
      const result = await createWallet(data)
      if (result.error) { toast.error(result.error); return }
      toast.success('Wallet berhasil ditambahkan')
    })
  }

  return <form>...</form>
}
```

### Pola 3: Realtime subscription

```typescript
// hooks/useNotifications.ts
'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'

export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState([])
  const supabase = createBrowserClient()

  useEffect(() => {
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  return notifications
}
```

---

## Jenis Task & Estimasi Waktu

| Task Type | Contoh | Estimasi |
|-----------|--------|----------|
| Schema change | Tambah kolom baru | 15 menit (migration + types) |
| Server Action baru | createBudget() | 20–30 menit |
| Halaman baru (simple) | /dashboard/reports | 45–60 menit |
| Komponen UI baru | BudgetCard | 30–45 menit |
| Fitur end-to-end | Scan Struk AI | 3–4 jam |
| Edge Function | send-reminder | 1–2 jam |

---

## Ketika Menemui Ambiguitas

Jika task tidak jelas:
1. Baca FEATURES.md untuk spesifikasi yang lebih detail
2. Jika masih tidak jelas → **tanya user** sebelum implementasi
3. Jangan asumsi requirement yang tidak tertulis

Format pertanyaan klarifikasi:
```
Sebelum implementasi, ada beberapa hal yang perlu dikonfirmasi:
1. [Pertanyaan spesifik]
2. [Pertanyaan spesifik]
Ini akan mempengaruhi [aspek implementasi].
```

---

## Batasan Agent

Agent TIDAK boleh:
- Mengubah file di `components/ui/` (shadcn generated)
- Menghapus migration yang sudah ada — buat migration baru saja
- Mengubah RLS policy yang sudah ada tanpa konfirmasi eksplisit
- Deploy ke Firebase tanpa instruksi eksplisit
- Menggunakan `supabase.auth.admin` di client-side code
- Membuat fitur di luar scope ROADMAP tanpa konfirmasi

---

## Setup Lokal (untuk referensi)

```bash
# 1. Install dependencies
npm install

# 2. Setup env
cp .env.example .env.local
# Isi semua variable di .env.local

# 3. Setup Supabase local (opsional)
npx supabase start
npx supabase db push

# 4. Generate types dari Supabase
npx supabase gen types typescript --local > types/database.ts

# 5. Run dev server
npm run dev
```

---

## Deploy

```bash
# Build
npm run build

# Deploy ke Firebase App Hosting
firebase deploy --only hosting

# Deploy Edge Functions ke Supabase
npx supabase functions deploy send-reminder
npx supabase functions deploy process-recurring
```
