'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { Trash2, Play, Pause, Calendar, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toggleRecurringStatus, deleteRecurringTemplate } from '@/actions/recurring'
import { toast } from 'sonner'
import { RecurringForm } from './RecurringForm'
import { cn } from '@/lib/utils'

export interface RecurringTemplate {
  id: string
  name: string
  amount: number
  type: 'income' | 'expense' | 'transfer'
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  next_due_date: string
  end_date: string | null
  is_active: boolean
  notes: string | null
  wallet_id: string
  category_id: string | null
  categories: {
    name: string
    icon: string
    color: string
  } | null
  wallets: {
    name: string
  }
}

interface RecurringListClientProps {
  templates: RecurringTemplate[]
}

export function RecurringListClient({ templates: initialTemplates }: RecurringListClientProps) {
  const [templates, setTemplates] = useState<RecurringTemplate[]>(initialTemplates)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case 'daily': return 'Harian'
      case 'weekly': return 'Mingguan'
      case 'monthly': return 'Bulanan'
      case 'yearly': return 'Tahunan'
      default: return freq
    }
  }

  const handleToggleActive = async (templateId: string, currentStatus: boolean) => {
    setLoadingId(templateId)
    const newStatus = !currentStatus
    const result = await toggleRecurringStatus(templateId, newStatus)
    
    if (result.success) {
      setTemplates(prev => 
        prev.map(t => t.id === templateId ? { ...t, is_active: newStatus } : t)
      )
      toast.success(newStatus ? 'Rencana diaktifkan kembali.' : 'Rencana berhasil dijeda.')
    } else {
      toast.error(result.error || 'Gagal mengubah status rencana.')
    }
    setLoadingId(null)
  }

  const handleDelete = async (templateId: string) => {
    setLoadingId(templateId)
    const result = await deleteRecurringTemplate(templateId)
    
    if (result.success) {
      setTemplates(prev => prev.filter(t => t.id !== templateId))
      toast.success('Rencana berhasil dihapus.')
    } else {
      toast.error(result.error || 'Gagal menghapus rencana.')
    }
    setLoadingId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold tracking-tight">Rencana Transaksi Aktif ({templates.filter(t => t.is_active).length})</h2>
        <RecurringForm onSuccess={() => window.location.reload()} />
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Calendar className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="font-semibold text-sm">Belum ada rencana transaksi berulang.</p>
            <p className="text-xs mt-1">Buat rencana pengeluaran atau pemasukan rutin Anda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((t) => {
            const categoryColor = t.categories?.color || '#94a3b8'
            const categoryIcon = t.categories?.icon || '📄'
            const categoryName = t.categories?.name || 'Lainnya'

            return (
              <Card 
                key={t.id} 
                className={cn(
                  "transition-all duration-300 relative border-l-4",
                  t.is_active ? "opacity-100" : "opacity-60 grayscale-[30%]"
                )}
                style={{ borderLeftColor: categoryColor }}
              >
                <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                  
                  {/* Top Header info */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <div 
                        className="h-10 w-10 rounded-xl flex items-center justify-center text-lg border border-border shrink-0"
                        style={{ backgroundColor: `${categoryColor}15`, color: categoryColor }}
                      >
                        <span>{categoryIcon}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground line-clamp-1 text-sm">{t.name}</h4>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <Wallet className="h-3.5 w-3.5" />
                          <span>{t.wallets?.name}</span>
                          <span>•</span>
                          <span className="font-mono text-[10px] tracking-wider uppercase bg-secondary px-1.5 py-0.5 rounded">
                            {getFrequencyLabel(t.frequency)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Pause/Resume custom Switch */}
                    <button
                      type="button"
                      disabled={loadingId === t.id}
                      onClick={() => handleToggleActive(t.id, t.is_active)}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none select-none",
                        t.is_active ? "bg-black dark:bg-white" : "bg-neutral-200 dark:bg-neutral-800"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-black shadow-sm transition duration-200 ease-in-out",
                          t.is_active 
                            ? "translate-x-5 bg-white dark:bg-black" 
                            : "translate-x-0 bg-white dark:bg-neutral-600"
                        )}
                      />
                    </button>
                  </div>

                  {/* Body Amount and Dates */}
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] uppercase font-mono font-bold tracking-widest text-muted-foreground">Jumlah Rencana</p>
                      <p className={cn(
                        "text-lg font-black tracking-tight mt-0.5",
                        t.type === 'income' ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </p>
                    </div>

                    <div className="text-right text-xs text-muted-foreground">
                      <p className="flex items-center gap-1 justify-end font-medium">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Jatuh Tempo:</span>
                      </p>
                      <p className="font-bold text-foreground mt-0.5">
                        {format(new Date(t.next_due_date), 'd MMM yyyy', { locale: localeId })}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="pt-3 border-t border-border flex justify-between items-center text-xs">
                    <div className="text-muted-foreground truncate max-w-[60%]">
                      {t.notes ? `"${t.notes}"` : 'Tidak ada catatan'}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Edit Dialog Trigger */}
                      <RecurringForm 
                        id={t.id} 
                        initialData={{
                          name: t.name,
                          amount: t.amount,
                          type: t.type as 'income' | 'expense',
                          frequency: t.frequency,
                          next_due_date: t.next_due_date,
                          end_date: t.end_date,
                          notes: t.notes,
                          wallet_id: t.wallet_id,
                          category_id: t.category_id
                        }}
                        onSuccess={() => window.location.reload()}
                      />

                      {/* Delete AlertDialog */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="hover:text-rose-600 text-muted-foreground" disabled={loadingId === t.id}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus Rencana Berulang?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Apakah Anda yakin ingin menghapus rencana transaksi berulang &quot;{t.name}&quot;? 
                              Siklus otomatisasi masa depan untuk rencana ini akan dihentikan sepenuhnya. 
                              Riwayat transaksi yang sudah terbuat sebelumnya tidak akan terpengaruh.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(t.id)}
                              className="bg-rose-600 hover:bg-rose-700 text-white"
                            >
                              Ya, Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
