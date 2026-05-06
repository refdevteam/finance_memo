'use client'

import { useState } from 'react'
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
import { createWallet } from '@/actions/wallets'
import { toast } from 'sonner'

export function WalletForm() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState('cash')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      type: type,
      balance: Number(formData.get('balance')),
      color: formData.get('color') as string,
    }

    try {
      await createWallet(data)
      setOpen(false)
      toast.success('Dompet baru telah ditambahkan.')
    } catch (error) {
      toast.error('Terjadi kesalahan saat menambah dompet.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" />
            Tambah Dompet
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Tambah Dompet Baru</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Dompet</Label>
            <Input id="name" name="name" placeholder="Contoh: Tabungan Utama" required />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="type">Tipe</Label>
            <input type="hidden" name="type" value={type} required />
            <Select value={type} onValueChange={(val) => setType(val || 'cash')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih tipe">
                  {type === 'cash' ? 'Tunai (Cash)' : type === 'bank' ? 'Bank' : 'E-Wallet'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Tunai (Cash)</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="ewallet">E-Wallet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="balance">Saldo Awal</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500 text-sm">Rp</span>
              <Input 
                id="balance" 
                name="balance" 
                type="number" 
                className="pl-10" 
                placeholder="0" 
                required 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Warna Label</Label>
            <Input id="color" name="color" type="color" defaultValue="#10b981" className="h-10 p-1" />
          </div>

          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
            {loading ? 'Menyimpan...' : 'Simpan Dompet'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
