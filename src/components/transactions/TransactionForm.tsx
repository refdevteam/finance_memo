'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
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
import { addTransaction } from '@/actions/transactions'
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

export function TransactionForm() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState('expense')
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [walletId, setWalletId] = useState<string>('')
  const [categoryId, setCategoryId] = useState<string>('')
  
  const filteredCategories = categories.filter(c => c.type === type)

  // Initialize default selections when data loads or type changes
  useEffect(() => {
    if (wallets.length > 0 && !walletId) {
      setWalletId(wallets[0].id)
    }
  }, [wallets, walletId])

  useEffect(() => {
    if (filteredCategories.length > 0) {
      setCategoryId(filteredCategories[0].id)
    } else {
      setCategoryId('')
    }
  }, [type, categories])

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
    }
  }, [open, supabase])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    
    // Remove "Rp" and any non-numeric formatting if exist, just in case
    const rawAmount = (formData.get('amount') as string).replace(/[^0-9]/g, '')

    const data = {
      wallet_id: walletId,
      category_id: categoryId,
      amount: Number(rawAmount),
      type: type as 'income' | 'expense' | 'transfer',
      description: formData.get('description') as string,
      transaction_date: formData.get('transaction_date') as string,
    }

    const result = await addTransaction(data)
    
    if (result.success) {
      setOpen(false)
      toast.success('Transaksi berhasil dicatat!')
    } else {
      toast.error(result.error || 'Terjadi kesalahan.')
    }
    
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 rounded-xl">
            <Plus className="h-4 w-4 mr-2" />
            Transaksi Baru
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Catat Transaksi</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          
          {/* Tipe Transaksi (Toggle) */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${type === 'expense' ? 'bg-white dark:bg-slate-900 shadow-sm text-rose-600' : 'text-slate-500'}`}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${type === 'income' ? 'bg-white dark:bg-slate-900 shadow-sm text-emerald-600' : 'text-slate-500'}`}
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
                className="pl-10 text-lg font-bold" 
                placeholder="0" 
                required 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wallet_id">Dompet</Label>
            <Select value={walletId} onValueChange={(val) => setWalletId(val || '')} required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih sumber dana">
                  {walletId ? wallets.find(w => w.id === walletId)?.name : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {wallets.length === 0 ? (
                  <SelectItem value="empty" disabled>Belum ada dompet</SelectItem>
                ) : (
                  wallets.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category_id">Kategori</Label>
            <Select value={categoryId} onValueChange={(val) => setCategoryId(val || '')} required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih kategori">
                  {categoryId ? categories.find(c => c.id === categoryId)?.name : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.length === 0 ? (
                  <SelectItem value="empty" disabled>Belum ada kategori</SelectItem>
                ) : (
                  filteredCategories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transaction_date">Tanggal</Label>
              <Input 
                id="transaction_date" 
                name="transaction_date" 
                type="date" 
                defaultValue={new Date().toISOString().split('T')[0]} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Catatan (Opsional)</Label>
              <Input 
                id="description" 
                name="description" 
                placeholder="Makan siang..." 
              />
            </div>
          </div>

          <Button type="submit" className={`w-full text-white rounded-xl ${type === 'expense' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`} disabled={loading}>
            {loading ? 'Menyimpan...' : 'Simpan Transaksi'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
