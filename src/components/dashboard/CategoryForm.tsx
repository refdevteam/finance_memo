'use client'

import { useState } from 'react'
import { Plus, Tag } from 'lucide-react'
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
import { createCategory } from '@/actions/categories'
import { toast } from 'sonner'

const categoryTypeOptions = [
  { value: 'income', label: 'Pemasukan (Income)' },
  { value: 'expense', label: 'Pengeluaran (Expense)' },
]

export function CategoryForm() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState('expense')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      type: type as 'income' | 'expense',
      color: formData.get('color') as string,
      icon: 'Tag', // Default for now
    }

    try {
      await createCategory(data)
      setOpen(false)
      toast.success('Kategori kustom telah ditambahkan.')
    } catch (error) {
      toast.error('Terjadi kesalahan saat menambah kategori.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Kategori Kustom
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Tambah Kategori Kustom</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Kategori</Label>
            <Input id="name" name="name" placeholder="Contoh: Freelance" required />
          </div>
          
          <div className="space-y-2">
            <Label>Tipe</Label>
            <InlineSelect
              options={categoryTypeOptions}
              value={type}
              onChange={setType}
              placeholder="Pilih tipe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Warna</Label>
            <Input id="color" name="color" type="color" defaultValue="#94a3b8" className="h-10 p-1" />
          </div>

          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
            {loading ? 'Menyimpan...' : 'Simpan Kategori'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
