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

          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading}>
            {loading ? 'Menyimpan...' : 'Simpan Dompet'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
