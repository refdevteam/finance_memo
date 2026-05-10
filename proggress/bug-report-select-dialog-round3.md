# Bug Report: Select Item Tidak Bisa Diklik di Dalam Dialog (Round 3)

**Project:** Finance Memo  
**File:** `WalletForm.tsx`, `select.tsx`  
**Status:** 🔴 Critical — Opsi Bank dan E-Wallet tetap tidak bisa dipilih  
**Reporter:** Code Review (Senior Dev / QA / PM)

---

## Status Fix Sebelumnya

| Round | Fix | Hasil |
|-------|-----|-------|
| 1 | `defaultValue` → `value` pada Select | ✅ Berhasil — Select sudah controlled |
| 2 | `alignItemWithTrigger=false` di `select.tsx` | ✅ Berhasil — posisi dropdown sudah benar |
| 3 | Guard `onOpenChange` di Dialog | ❌ Tidak cukup — klik item masih diblokir |

Posisi dropdown sudah benar setelah Round 2, namun opsi Bank dan E-Wallet **tetap tidak bisa dipilih**.

---

## Root Cause Final

Base UI Dialog secara internal memasang `pointerdown` listener di level `document`. Saat user mengklik item Select, listener ini memeriksa apakah target klik berada di dalam DOM subtree Dialog.

Karena `SelectPrimitive.Positioner` mem-portal kontennya ke `<body>` (di **luar** subtree Dialog), Base UI menganggapnya sebagai klik di luar dan memanggil `event.preventDefault()` — yang mencegah Select item menerima klik, **terlepas dari guard `onOpenChange` yang sudah ditambahkan di Round 2.**

**Solusi arsitektural yang benar:** Portal Select content ke **dalam** DOM Dialog, bukan ke `<body>`, sehingga Base UI tidak menganggapnya sebagai outside click.

---

## Fix

### Fix 1 — `select.tsx`: Tambah Prop `container` ke `SelectContent`

Ekspos prop `container` dari `SelectPrimitive.Positioner` agar bisa dikontrol dari luar:

```tsx
const SelectContent = React.forwardRef<
  HTMLDivElement,
  SelectPrimitive.Popup.Props &
    Pick<
      SelectPrimitive.Positioner.Props,
      "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger" | "container" // ← tambah container
    >
>(
  (
    {
      className,
      children,
      side = "bottom",
      sideOffset = 4,
      align = "center",
      alignOffset = 0,
      alignItemWithTrigger = false,
      container,           // ← destructure
      ...props
    },
    ref
  ) => (
    <SelectPrimitive.Positioner
      side={side}
      sideOffset={sideOffset}
      align={align}
      alignOffset={alignOffset}
      alignItemWithTrigger={alignItemWithTrigger}
      container={container}   // ← pass ke Positioner
      className="isolate z-[100]"
    >
      <SelectPrimitive.Popup
        ref={ref}
        data-slot="select-content"
        data-align-trigger={alignItemWithTrigger}
        className={cn(
          "relative isolate z-[100] max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl text-popover-foreground shadow-xl border border-white/20 dark:border-slate-800/20 shadow-black/5 duration-100 data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.List>{children}</SelectPrimitive.List>
        <SelectScrollDownButton />
      </SelectPrimitive.Popup>
    </SelectPrimitive.Positioner>
  )
)
```

---

### Fix 2 — `WalletForm.tsx`: Portal Select ke Dalam DOM Dialog via `container`

```tsx
'use client'

import { useState } from 'react'  // ← useRef tidak diperlukan, cukup useState
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
  // State (bukan ref) agar SelectContent re-render saat container tersedia
  const [selectContainer, setSelectContainer] = useState<HTMLDivElement | null>(null)

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
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) reset()
      }}
    >
      <DialogTrigger
        render={
          <Button type="button" className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20">
            <Plus className="h-4 w-4 mr-2" />
            Tambah Dompet
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Tambah Dompet Baru</DialogTitle>
        </DialogHeader>

        {/*
          Anchor point untuk portal Select.
          Harus berada di dalam DOM Dialog agar Base UI tidak menganggap
          klik pada dropdown sebagai outside click.
        */}
        <div ref={setSelectContainer} />

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
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih tipe" />
                  </SelectTrigger>
                  {/* container mengarahkan portal ke dalam DOM Dialog */}
                  <SelectContent container={selectContainer}>
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

## Mengapa `useState` bukan `useRef` untuk Container

Ini detail penting yang menentukan fix bekerja atau tidak:

```tsx
// ❌ useRef — selectContainer.current akan null saat SelectContent pertama render
//    karena ref tidak memicu re-render, SelectContent menerima null = portal ke body
const selectContainer = useRef<HTMLDivElement>(null)
<SelectContent container={selectContainer.current} />  // null → masalah lama kembali

// ✅ useState dengan callback ref — setter dipanggil saat div ter-mount,
//    React otomatis re-render, selectContainer sudah berisi elemen yang valid
const [selectContainer, setSelectContainer] = useState<HTMLDivElement | null>(null)
<div ref={setSelectContainer} />
<SelectContent container={selectContainer} />  // container valid ✓
```

---

## Ringkasan Semua Fix Akumulatif (Round 1–3)

| Round | Masalah | File | Fix |
|-------|---------|------|-----|
| 1 | `defaultValue` membuat Select uncontrolled | `WalletForm.tsx` | Ganti ke `value` |
| 2 | Posisi dropdown meleset akibat CSS transform Dialog | `select.tsx` | `alignItemWithTrigger=false` |
| 3 | Klik item diblokir Base UI Dialog focus trap | `select.tsx` + `WalletForm.tsx` | Ekspos prop `container`, portal Select ke dalam DOM Dialog |

---

## Catatan untuk Tim

> **Pelajaran utama:** Ketika menggunakan dua komponen Base UI yang masing-masing memiliki portal (Dialog dan Select), pastikan portal komponen anak diarahkan ke dalam DOM subtree komponen induk. Base UI Dialog menggunakan `pointerdown` listener untuk mendeteksi outside click berdasarkan DOM containment — bukan berdasarkan z-index atau posisi visual. Solusi z-index atau guard state tidak akan cukup; satu-satunya solusi yang benar adalah memastikan DOM hierarchy sesuai.

---

*Generated from code review — Finance Memo Project*
