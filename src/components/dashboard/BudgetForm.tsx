'use client'

import { useState, useTransition } from 'react'
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
import { setBudget } from '@/actions/budgets'
import { toast } from 'sonner'
import * as LucideIcons from 'lucide-react'

interface BudgetFormProps {
  categoryId: string
  categoryName: string
  categoryIcon?: string
  categoryColor?: string
  currentLimit: number
  currentNotes: string | null
  month: number
  year: number
  trigger: React.ReactElement
}

export function BudgetForm({
  categoryId,
  categoryName,
  categoryIcon = 'Tag',
  categoryColor = '#94a3b8',
  currentLimit,
  currentNotes,
  month,
  year,
  trigger
}: BudgetFormProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [amount, setAmount] = useState(currentLimit > 0 ? currentLimit.toString() : '')
  const [notes, setNotes] = useState(currentNotes || '')

  // Dynamic icon
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Icon = (LucideIcons as any)[categoryIcon] || LucideIcons.Tag

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setAmount(currentLimit > 0 ? currentLimit.toString() : '')
      setNotes(currentNotes || '')
    }
    setOpen(newOpen)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const limitVal = parseFloat(amount.replace(/[^0-9]/g, '')) || 0

    startTransition(async () => {
      try {
        const res = await setBudget(categoryId, limitVal, month, year, notes)
        if (res.success) {
          toast.success(
            limitVal > 0 
              ? `Anggaran untuk "${categoryName}" berhasil diatur.` 
              : `Anggaran untuk "${categoryName}" berhasil dinonaktifkan.`
          )
          setOpen(false)
        } else {
          toast.error(res.error || 'Gagal menyimpan anggaran.')
        }
      } catch (err) {
        toast.error('Terjadi kesalahan sistem saat menyimpan anggaran.')
      }
    })
  }

  const handleRemoveBudget = () => {
    startTransition(async () => {
      try {
        const res = await setBudget(categoryId, 0, month, year, '')
        if (res.success) {
          toast.success(`Anggaran untuk "${categoryName}" dinonaktifkan.`)
          setOpen(false)
        } else {
          toast.error(res.error || 'Gagal menonaktifkan anggaran.')
        }
      } catch (err) {
        toast.error('Terjadi kesalahan sistem saat menonaktifkan anggaran.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader className="flex flex-row items-center space-x-3 pb-2 border-b border-border/40">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center border shadow-xs"
            style={{ 
              backgroundColor: `${categoryColor}12`,
              color: categoryColor,
              borderColor: `${categoryColor}25`
            }}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-base font-bold text-slate-800 dark:text-slate-100">
              Atur Anggaran Kategori
            </DialogTitle>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              Kategori: {categoryName}
            </p>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-3">
          <div className="space-y-2">
            <Label htmlFor="amount" className="font-semibold text-xs text-slate-500 uppercase tracking-wider">
              Nominal Anggaran (Rp)
            </Label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                Rp
              </span>
              <Input
                id="amount"
                type="text"
                placeholder="0"
                value={amount}
                onChange={(e) => {
                  // Allow only numbers
                  const val = e.target.value.replace(/[^0-9]/g, '')
                  setAmount(val ? Number(val).toLocaleString('id-ID') : '')
                }}
                className="pl-10 pr-4 py-5 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-semibold focus-visible:ring-emerald-500"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="font-semibold text-xs text-slate-500 uppercase tracking-wider">
              Catatan Anggaran (Opsional)
            </Label>
            <Input
              id="notes"
              type="text"
              placeholder="Contoh: Batas maksimal jajan kopi"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="py-5 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-emerald-500"
            />
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button 
              type="submit" 
              className="w-full bg-black text-white hover:bg-neutral-900 dark:bg-white dark:text-black dark:hover:bg-neutral-100 rounded-full py-2.5 font-semibold transition-all"
              disabled={isPending}
            >
              {isPending ? 'Menyimpan...' : 'Simpan Anggaran'}
            </Button>
            
            {currentLimit > 0 && (
              <Button 
                type="button" 
                variant="ghost"
                onClick={handleRemoveBudget}
                className="w-full text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-full py-2.5 font-semibold transition-all"
                disabled={isPending}
              >
                Hapus Anggaran
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
