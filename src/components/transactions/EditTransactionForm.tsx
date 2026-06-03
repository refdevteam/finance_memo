'use client'

import { useState, useEffect } from 'react'
import { Pencil } from 'lucide-react'
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
import { updateTransaction } from '@/actions/transactions'
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

interface EditTransactionFormProps {
  transaction: {
    id: string
    wallet_id: string
    category_id: string | null
    amount: number
    type: string
    description: string | null
    transaction_date: string
  }
}

export function EditTransactionForm({ transaction }: EditTransactionFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState(transaction.type)
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  
  const [walletId, setWalletId] = useState<string>(transaction.wallet_id)
  const [categoryId, setCategoryId] = useState<string>(transaction.category_id || '')
  
  const filteredCategories = categories.filter(c => c.type === type)

  const supabase = createClient()

  // Fetch wallets and categories only when dialog is opened
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
      
      // Reset state to initial data when opened
      setType(transaction.type)
      setWalletId(transaction.wallet_id)
      setCategoryId(transaction.category_id || '')
    }
  }, [open, supabase, transaction])

  // Handle category fallback if switching types and category isn't valid
  useEffect(() => {
    if (open && categories.length > 0) {
      const validCategoryForType = categories.find(c => c.id === categoryId && c.type === type)
      if (!validCategoryForType) {
        const firstCategoryOfType = categories.find(c => c.type === type)
        setCategoryId(firstCategoryOfType?.id || '')
      }
    }
  }, [type, categories, categoryId, open])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const rawAmount = (formData.get('amount') as string).replace(/[^0-9]/g, '')

    const data = {
      wallet_id: walletId,
      category_id: categoryId,
      amount: Number(rawAmount),
      type: type as 'income' | 'expense',
      description: formData.get('description') as string,
      transaction_date: formData.get('transaction_date') as string,
    }

    const result = await updateTransaction(transaction.id, data)
    
    if (result.success) {
      setOpen(false)
      toast.success('Transaksi berhasil diperbarui!')
    } else {
      toast.error(result.error || 'Terjadi kesalahan.')
    }
    
    setLoading(false)
  }

  // Jika transaksi adalah transfer, kita disable edit karena belum didukung
  if (transaction.type === 'transfer') {
    return (
      <Button variant="ghost" size="icon" disabled title="Edit transfer tidak didukung">
        <Pencil className="h-4 w-4 text-slate-300" />
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20">
            <Pencil className="h-4 w-4" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Transaksi</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          
          {/* Tipe Transaksi (Toggle) */}
          <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${type === 'expense' ? 'bg-white dark:bg-card shadow-sm text-rose-600' : 'text-neutral-500 dark:text-neutral-400'}`}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${type === 'income' ? 'bg-white dark:bg-card shadow-sm text-emerald-600' : 'text-neutral-500 dark:text-neutral-400'}`}
            >
              Pemasukan
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Jumlah</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500 font-medium">Rp</span>
              <Input 
                id="amount" 
                name="amount" 
                type="number" 
                defaultValue={transaction.amount}
                className="pl-10 text-lg font-bold" 
                placeholder="0" 
                required 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Dompet</Label>
            <InlineSelect
              options={wallets.length === 0 
                ? [{ value: '', label: 'Memuat dompet...', disabled: true }]
                : wallets.map(w => ({ value: w.id, label: w.name }))
              }
              value={walletId}
              onChange={setWalletId}
              placeholder="Pilih sumber dana"
            />
          </div>

          <div className="space-y-2">
            <Label>Kategori</Label>
            <InlineSelect
              options={filteredCategories.length === 0
                ? [{ value: '', label: 'Memuat kategori...', disabled: true }]
                : filteredCategories.map(c => ({ value: c.id, label: c.name }))
              }
              value={categoryId}
              onChange={setCategoryId}
              placeholder="Pilih kategori"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transaction_date">Tanggal</Label>
              <Input 
                id="transaction_date" 
                name="transaction_date" 
                type="date" 
                defaultValue={transaction.transaction_date} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Catatan (Opsional)</Label>
              <Input 
                id="description" 
                name="description" 
                defaultValue={transaction.description || ''}
                placeholder="Makan siang..." 
              />
            </div>
          </div>

          <Button type="submit" className={`w-full text-white rounded-xl ${type === 'expense' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`} disabled={loading}>
            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
