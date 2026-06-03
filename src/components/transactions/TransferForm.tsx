'use client'

import { useState, useEffect } from 'react'
import { ArrowRightLeft } from 'lucide-react'
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
import { addTransfer } from '@/actions/transfers'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Wallet {
  id: string
  name: string
  balance: number
}

export function TransferForm() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [wallets, setWallets] = useState<Wallet[]>([])
  
  const [fromWalletId, setFromWalletId] = useState<string>('')
  const [toWalletId, setToWalletId] = useState<string>('')
  
  const supabase = createClient()

  // Fetch wallets only when dialog is opened
  useEffect(() => {
    if (open) {
      const fetchWallets = async () => {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) return

        const { data } = await supabase
          .from('wallets')
          .select('id, name, balance')
          .eq('user_id', userData.user.id)
          .eq('is_active', true)

        if (data) {
          setWallets(data)
          if (data.length >= 2) {
            setFromWalletId(data[0].id)
            setToWalletId(data[1].id)
          }
        }
      }
      fetchWallets()
    }
  }, [open, supabase])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const rawAmount = (formData.get('amount') as string).replace(/[^0-9]/g, '')

    const data = {
      from_wallet_id: fromWalletId,
      to_wallet_id: toWalletId,
      amount: Number(rawAmount),
      notes: formData.get('notes') as string,
      transfer_date: formData.get('transfer_date') as string,
    }

    if (data.from_wallet_id === data.to_wallet_id) {
      toast.error('Dompet asal dan tujuan tidak boleh sama.')
      setLoading(false)
      return
    }

    const result = await addTransfer(data)
    
    if (result.success) {
      setOpen(false)
      toast.success('Transfer berhasil dicatat!')
      
      // Reset form on success
      setFromWalletId(wallets[0]?.id || '')
      setToWalletId(wallets[1]?.id || '')
    } else {
      toast.error(result.error || 'Terjadi kesalahan saat memproses transfer.')
    }
    
    setLoading(false)
  }

  const walletOptions = wallets.length === 0 
    ? [{ value: '', label: 'Belum ada dompet', disabled: true }]
    : wallets.map(w => ({ value: w.id, label: w.name }))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="rounded-xl shadow-sm border-border">
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Transfer
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Transfer Saldo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          
          <div className="space-y-2">
            <Label htmlFor="amount">Jumlah Transfer</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground font-medium">Rp</span>
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

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Dari Dompet (Sumber)</Label>
              <InlineSelect
                options={walletOptions}
                value={fromWalletId}
                onChange={setFromWalletId}
                placeholder="Pilih sumber dana"
              />
            </div>
            
            <div className="flex justify-center -my-2 relative z-10">
              <div className="bg-secondary p-2 rounded-full border-4 border-background dark:border-background">
                <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ke Dompet (Tujuan)</Label>
              <InlineSelect
                options={walletOptions}
                value={toWalletId}
                onChange={setToWalletId}
                placeholder="Pilih tujuan transfer"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transfer_date">Tanggal</Label>
              <Input 
                id="transfer_date" 
                name="transfer_date" 
                type="date" 
                defaultValue={new Date().toISOString().split('T')[0]} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Catatan (Opsional)</Label>
              <Input 
                id="notes" 
                name="notes" 
                placeholder="Tabungan bulanan..." 
              />
            </div>
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20" disabled={loading || wallets.length < 2}>
            {loading ? 'Memproses...' : 'Proses Transfer'}
          </Button>
          
          {wallets.length < 2 && (
            <p className="text-xs text-rose-500 text-center mt-2">
              Anda membutuhkan setidaknya 2 dompet untuk melakukan transfer.
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
