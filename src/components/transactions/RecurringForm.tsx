'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, AlertTriangle } from 'lucide-react'
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
import { createRecurringTemplate, updateRecurringTemplate } from '@/actions/recurring'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Wallet {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
  type: string
}

interface RecurringFormProps {
  id?: string
  initialData?: {
    name: string
    amount: number
    type: 'income' | 'expense'
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
    next_due_date: string
    end_date: string | null
    notes: string | null
    wallet_id: string
    category_id: string | null
  }
  onSuccess?: () => void
}

export function RecurringForm({ id, initialData, onSuccess }: RecurringFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState<'income' | 'expense'>(initialData?.type || 'expense')
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>(initialData?.frequency || 'monthly')
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [walletId, setWalletId] = useState<string>(initialData?.wallet_id || '')
  const [categoryId, setCategoryId] = useState<string>(initialData?.category_id || '')

  const filteredCategories = categories.filter(c => c.type === type)

  // Initialize default selections when data loads
  useEffect(() => {
    if (wallets.length > 0 && !walletId) {
      setWalletId(wallets[0].id)
    }
  }, [wallets, walletId])

  // Handle category fallback if switching types or category isn't valid
  useEffect(() => {
    if (categories.length > 0) {
      const validCategoryForType = categories.find(c => c.id === categoryId && c.type === type)
      if (!validCategoryForType) {
        const firstCategoryOfType = categories.find(c => c.type === type)
        setCategoryId(firstCategoryOfType?.id || '')
      }
    }
  }, [type, categories, categoryId])

  const supabase = createClient()

  // Fetch wallets and categories when dialog is opened
  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) return

        const [walletsRes, categoriesRes] = await Promise.all([
          supabase.from('wallets').select('id, name').eq('user_id', userData.user.id),
          supabase.from('categories').select('id, name, type').or(`user_id.eq.${userData.user.id},is_default.eq.true`)
        ])

        if (walletsRes.data) setWallets(walletsRes.data)
        if (categoriesRes.data) setCategories(categoriesRes.data)
      }
      fetchData()
    }
  }, [open, supabase])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const rawAmount = (formData.get('amount') as string).replace(/[^0-9]/g, '')

    const data = {
      name: formData.get('name') as string,
      amount: Number(rawAmount),
      type: type,
      frequency: frequency,
      wallet_id: walletId,
      category_id: categoryId || null,
      next_due_date: formData.get('next_due_date') as string,
      end_date: (formData.get('end_date') as string) || null,
      notes: (formData.get('notes') as string) || null,
    }

    const result = id
      ? await updateRecurringTemplate(id, data)
      : await createRecurringTemplate(data)

    if (result.success) {
      setOpen(false)
      toast.success(id ? 'Rencana berhasil diperbarui!' : 'Rencana baru berhasil dibuat!')
      onSuccess?.()
    } else {
      toast.error(result.error || 'Terjadi kesalahan.')
    }

    setLoading(false)
  }

  const frequencyOptions = [
    { value: 'daily', label: 'Harian' },
    { value: 'weekly', label: 'Mingguan' },
    { value: 'monthly', label: 'Bulanan' },
    { value: 'yearly', label: 'Tahunan' },
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          initialData ? (
            <Button variant="ghost" size="icon" className="hover:text-primary text-muted-foreground">
              <Pencil className="h-4 w-4" />
            </Button>
          ) : (
            <Button className="bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200">
              <Plus className="h-4 w-4 mr-2" />
              Rencana Baru
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Rencana Berulang' : 'Buat Transaksi Berulang'}</DialogTitle>
        </DialogHeader>
        {wallets.length === 0 ? (
          <div className="py-8 text-center space-y-4">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl w-fit mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                Dompet Tidak Ditemukan
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-[280px] mx-auto">
                Anda belum memiliki dompet aktif. Silakan buat dompet terlebih dahulu sebelum membuat rencana transaksi berulang.
              </p>
            </div>
            <div className="pt-2">
              <Button
                onClick={() => {
                  setOpen(false)
                  window.location.href = '/dashboard/wallets'
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold"
              >
                Buat Dompet Sekarang
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          
          {/* Tipe Transaksi (Toggle) */}
          <div className="flex bg-secondary p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${type === 'expense' ? 'bg-card shadow-sm text-rose-600' : 'text-muted-foreground'}`}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${type === 'income' ? 'bg-card shadow-sm text-emerald-600' : 'text-muted-foreground'}`}
            >
              Pemasukan
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nama Rencana</Label>
              <Input 
                id="name" 
                name="name" 
                defaultValue={initialData?.name}
                placeholder="Langganan Netflix, Cicilan..." 
                required 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount">Jumlah</Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-muted-foreground font-medium text-sm">Rp</span>
                <Input 
                  id="amount" 
                  name="amount" 
                  type="number" 
                  className="pl-9 text-base font-semibold" 
                  placeholder="0" 
                  defaultValue={initialData?.amount}
                  required 
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Dompet</Label>
              <InlineSelect
                options={wallets.length === 0 
                  ? [{ value: '', label: 'Belum ada dompet', disabled: true }]
                  : wallets.map(w => ({ value: w.id, label: w.name }))
                }
                value={walletId}
                onChange={setWalletId}
                placeholder="Pilih dompet"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <InlineSelect
                options={filteredCategories.length === 0
                  ? [{ value: '', label: 'Belum ada kategori', disabled: true }]
                  : filteredCategories.map(c => ({ value: c.id, label: c.name }))
                }
                value={categoryId}
                onChange={setCategoryId}
                placeholder="Pilih kategori"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Frekuensi</Label>
              <InlineSelect
                options={frequencyOptions}
                value={frequency}
                onChange={(val) => setFrequency(val as 'daily' | 'weekly' | 'monthly' | 'yearly')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="next_due_date">Jatuh Tempo Pertama</Label>
              <Input 
                id="next_due_date" 
                name="next_due_date" 
                type="date" 
                defaultValue={initialData?.next_due_date || new Date().toISOString().split('T')[0]} 
                required 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="end_date">Tanggal Selesai (Opsional)</Label>
              <Input 
                id="end_date" 
                name="end_date" 
                type="date" 
                defaultValue={initialData?.end_date || ''} 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Catatan (Opsional)</Label>
              <Input 
                id="notes" 
                name="notes" 
                placeholder="Deskripsi singkat..." 
                defaultValue={initialData?.notes || ''}
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className={`w-full text-white rounded-xl ${type === 'expense' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`} 
            disabled={loading}
          >
            {loading ? 'Menyimpan...' : (initialData ? 'Perbarui Rencana' : 'Simpan Rencana')}
          </Button>
        </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
