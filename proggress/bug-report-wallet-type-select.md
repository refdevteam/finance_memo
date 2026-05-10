# Bug Report: Tipe Dompet Tidak Bisa Dipilih (WalletForm)

**Project:** Finance Memo  
**File:** `WalletForm.tsx`  
**Status:** 🔴 Critical — Fitur tidak berfungsi sesuai spec  
**Reporter:** Code Review (Senior Dev / QA / PM)

---

## Ringkasan

User tidak bisa memilih tipe dompet selain **"Tunai (Cash)"** yang merupakan nilai default. Pemilihan opsi lain (Bank, E-Wallet) tidak mengubah nilai form state, sehingga semua dompet yang dibuat selalu tersimpan dengan tipe `cash`.

---

## Root Cause

### 1. `defaultValue` vs `value` pada Komponen `<Select>` (Bug Utama)

Komponen `<Select>` dari **shadcn/ui (Radix UI)** bersifat *controlled* ketika diintegrasikan dengan `react-hook-form`. Menggunakan prop `defaultValue` membuat Select berperilaku *uncontrolled* — nilai dikunci saat render pertama dan tidak merespons perubahan dari `field.onChange`.

```tsx
// ❌ BERMASALAH — Select tidak terhubung ke RHF state
<Select 
  defaultValue={field.value}
  onValueChange={field.onChange}
>
```

**Mengapa ini terjadi?**

- `defaultValue` hanya menetapkan nilai awal sekali saat mount, lalu komponen "tidak peduli" dengan perubahan state eksternal.
- `react-hook-form` mengelola state secara internal, tetapi Select tidak tahu bahwa nilainya harus berubah karena tidak ada `value` prop yang menghubungkan keduanya.
- Akibatnya, meski user memilih "Bank" atau "E-Wallet", nilai form state tetap `"cash"`.

---

### 2. `DialogTrigger` Menggunakan Prop `render` yang Tidak Valid (Bug Sekunder)

```tsx
// ❌ Bukan API DialogTrigger shadcn/ui
<DialogTrigger
  render={
    <Button type="button" ...>
      Tambah Dompet
    </Button>
  }
/>
```

`DialogTrigger` dari shadcn/ui tidak memiliki prop `render`. Pola yang benar adalah menggunakan `asChild` dengan elemen anak.

---

## Fix

### Fix 1 — Ganti `defaultValue` dengan `value` (Controlled Select)

```tsx
// ✅ BENAR — Select terhubung ke RHF state
<Controller
  name="type"
  control={control}
  render={({ field }) => (
    <Select 
      value={field.value}            // ← ganti dari defaultValue ke value
      onValueChange={field.onChange}
      name={field.name}
      onOpenChange={() => field.onBlur()}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Pilih tipe" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="cash">Tunai (Cash)</SelectItem>
        <SelectItem value="bank">Bank</SelectItem>
        <SelectItem value="ewallet">E-Wallet</SelectItem>
      </SelectContent>
    </Select>
  )}
/>
```

**Perubahan yang dilakukan:**

| Prop | Sebelum | Sesudah |
|------|---------|---------|
| `defaultValue` | `{field.value}` | *(dihapus)* |
| `value` | *(tidak ada)* | `{field.value}` |
| `name` | *(tidak ada)* | `{field.name}` |
| `onOpenChange` | *(tidak ada)* | `() => field.onBlur()` |

---

### Fix 2 — Perbaiki `DialogTrigger`

```tsx
// ✅ BENAR — gunakan asChild dengan elemen anak
<DialogTrigger asChild>
  <Button type="button" className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20">
    <Plus className="h-4 w-4 mr-2" />
    Tambah Dompet
  </Button>
</DialogTrigger>
```

---

## Kode Lengkap Setelah Fix

```tsx
'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useForm, Controller, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createWallet } from '@/actions/wallets'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const schema = z.object({
  name: z.string().min(1, 'Nama dompet wajib diisi'),
  type: z.string().min(1, 'Tipe dompet wajib dipilih'),
  balance: z.number().min(0, 'Saldo minimal 0'),
  color: z.string().min(1),
})

type WalletData = z.infer<typeof schema>

export function WalletForm() {
  const [open, setOpen] = useState(false)
  const { register, handleSubmit, control, reset, formState: { isSubmitting, errors } } = useForm<WalletData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      type: 'cash',
      balance: 0,
      color: '#10b981',
    }
  })

  const onSubmit: SubmitHandler<WalletData> = async (data) => {
    try {
      await createWallet(data)
      setOpen(false)
      reset()
      toast.success('Dompet baru telah ditambahkan.')
    } catch (error) {
      toast.error('Terjadi kesalahan saat menambah dompet.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v)
      if (!v) reset()
    }}>
      {/* ✅ Fix 2: gunakan asChild */}
      <DialogTrigger asChild>
        <Button type="button" className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20">
          <Plus className="h-4 w-4 mr-2" />
          Tambah Dompet
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Tambah Dompet Baru</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Dompet</Label>
            <Input 
              id="name" 
              placeholder="Contoh: Tabungan Utama" 
              {...register('name')}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label>Tipe Dompet</Label>
            {/* ✅ Fix 1: gunakan value (controlled) bukan defaultValue */}
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select 
                  value={field.value}
                  onValueChange={field.onChange}
                  name={field.name}
                  onOpenChange={() => field.onBlur()}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Tunai (Cash)</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="ewallet">E-Wallet</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && <p className="text-xs text-destructive mt-1">{errors.type.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="balance">Saldo Awal</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500 text-sm">Rp</span>
              <Input 
                id="balance" 
                type="number" 
                placeholder="0" 
                {...register('balance', { valueAsNumber: true })}
                className={cn("pl-10", errors.balance ? "border-destructive" : "")}
              />
            </div>
            {errors.balance && <p className="text-xs text-destructive mt-1">{errors.balance.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Warna Label</Label>
            <Input id="color" type="color" className="h-10 p-1" {...register('color')} />
          </div>

          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan Dompet'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Ringkasan per Perspektif

| Role | Temuan |
|------|--------|
| **Dev** | `defaultValue` membuat Select *uncontrolled*, tidak terhubung ke RHF state. Harus diganti `value`. `DialogTrigger` juga salah API — harus `asChild`. |
| **QA** | Bug reproducible 100% — semua dompet tersimpan sebagai tipe `cash` terlepas dari pilihan user. Perlu test case: pilih "Bank" → submit → verifikasi tipe di DB/response. |
| **PM** | Fitur tambah dompet tidak berfungsi sesuai spec. User tidak bisa membedakan dompet berdasarkan tipe, merusak pengalaman pencatatan keuangan bulanan secara keseluruhan. |

---

*Generated from code review — Finance Memo Project*
