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
import { InlineSelect } from '@/components/ui/inline-select'
import { createWallet } from '@/actions/wallets'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const schema = z.object({
  name: z.string().min(1, 'Nama dompet wajib diisi'),
  type: z.string().min(1, 'Tipe dompet wajib dipilih'),
  balance: z.number().min(0, 'Saldo minimal 0'),
  color: z.string().min(1),
  is_event_wallet: z.boolean(),
})

type WalletData = z.infer<typeof schema>

const walletTypeOptions = [
  { value: 'cash', label: 'Tunai (Cash)' },
  { value: 'bank', label: 'Bank' },
  { value: 'ewallet', label: 'E-Wallet' },
]

export function WalletForm() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<WalletData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      type: 'cash',
      balance: 0,
      color: '#10b981',
      is_event_wallet: false,
    }
  })

  const onSubmit: SubmitHandler<WalletData> = async (data) => {
    setLoading(true)
    try {
      await createWallet(data)
      setOpen(false)
      reset()
      toast.success('Dompet baru telah ditambahkan.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan saat menambah dompet.')
    } finally {
      setLoading(false)
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
                <InlineSelect
                  options={walletTypeOptions}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Pilih tipe dompet"
                  error={!!errors.type}
                />
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

          <div className="flex items-start space-x-2 py-2 border-t border-border mt-2 pt-4">
            <input 
              id="is_event_wallet" 
              type="checkbox" 
              {...register('is_event_wallet')}
              className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700 text-emerald-600 focus:ring-emerald-500 mt-0.5 cursor-pointer"
            />
            <div className="grid gap-1 leading-tight">
              <Label htmlFor="is_event_wallet" className="cursor-pointer select-none text-sm font-bold text-neutral-800 dark:text-neutral-250">
                Jadikan Dompet Acara/Liburan (Event Wallet)
              </Label>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-450 leading-normal">
                Pencatatan di dompet ini akan dikhususkan untuk event/liburan tertentu dan dieksklusi dari laporan bulanan utama.
              </p>
            </div>
          </div>

          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-4" disabled={loading}>
            {loading ? 'Menyimpan...' : 'Simpan Dompet'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
