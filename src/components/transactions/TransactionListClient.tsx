'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Trash2, FilterX } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { deleteTransaction } from '@/actions/transactions'
import { toast } from 'sonner'
import { EditTransactionForm } from './EditTransactionForm'
import { InlineSelect } from '@/components/ui/inline-select'

interface TransactionListProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transactions: any[]
  wallets: { id: string, name: string }[]
}

export function TransactionListClient({ transactions, wallets }: TransactionListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const currentType = searchParams.get('type') || 'all'
  const currentWallet = searchParams.get('wallet') || 'all'

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`/dashboard/transactions?${params.toString()}`)
  }

  const handleDelete = async (trxId: string) => {
    setIsDeleting(trxId)
    const result = await deleteTransaction(trxId)
    if (result.success) {
      toast.success('Transaksi berhasil dihapus.')
    } else {
      toast.error(result.error || 'Gagal menghapus transaksi.')
    }
    setIsDeleting(null)
  }

  const walletOptions = [
    { value: 'all', label: 'Semua Dompet' },
    ...wallets.map(w => ({ value: w.id, label: w.name }))
  ]

  const typeOptions = [
    { value: 'all', label: 'Semua Tipe' },
    { value: 'expense', label: 'Pengeluaran' },
    { value: 'income', label: 'Pemasukan' },
    { value: 'transfer', label: 'Transfer' },
  ]

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-medium text-slate-500 ml-1">Filter Tipe</label>
          <InlineSelect 
            options={typeOptions}
            value={currentType}
            onChange={(val) => handleFilterChange('type', val)}
          />
        </div>
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-medium text-slate-500 ml-1">Filter Dompet</label>
          <InlineSelect 
            options={walletOptions}
            value={currentWallet}
            onChange={(val) => handleFilterChange('wallet', val)}
          />
        </div>
        
        {(currentType !== 'all' || currentWallet !== 'all') && (
          <div className="flex items-end">
            <Button 
              variant="ghost" 
              onClick={() => router.push('/dashboard/transactions')}
              className="text-slate-500 hover:text-rose-500"
            >
              <FilterX className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        )}
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <p className="font-medium">Tidak ada transaksi ditemukan.</p>
            <p className="text-sm mt-1">Coba sesuaikan filter Anda atau tambah transaksi baru.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {transactions.map((t) => {
              const categoryColor = t.categories?.color || '#94a3b8'
              const categoryIcon = t.categories?.icon || (t.type === 'transfer' ? '🔄' : '📄')
              const categoryName = t.categories?.name || (t.type === 'transfer' ? 'Transfer' : 'Lainnya')
              const isTransfer = t.type === 'transfer'

              return (
                <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors gap-4">
                  
                  {/* Left info */}
                  <div className="flex items-center gap-4">
                    <div 
                      className="h-12 w-12 rounded-[1rem] flex items-center justify-center text-xl shadow-sm border border-slate-100 dark:border-slate-800 flex-shrink-0"
                      style={{ backgroundColor: `${categoryColor}15`, color: categoryColor }}
                    >
                      <span>{categoryIcon}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                        {t.description || categoryName}
                      </p>
                      <div className="flex flex-wrap items-center text-xs text-slate-500 dark:text-slate-400 mt-1 gap-2">
                        <span className="font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          {t.wallets?.name || 'Dompet'}
                        </span>
                        <span>•</span>
                        <span>{format(new Date(t.transaction_date), 'd MMM yyyy', { locale: id })}</span>
                        {isTransfer && (
                          <>
                            <span>•</span>
                            <span className="text-blue-500 font-medium">Transfer</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Actions & Amount */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full pl-16 sm:pl-0">
                    <p className={`font-bold whitespace-nowrap ${t.type === 'income' ? 'text-emerald-600' : isTransfer ? 'text-blue-600' : 'text-slate-900 dark:text-white'}`}>
                      {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}{formatCurrency(t.amount)}
                    </p>
                    
                    <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 p-0.5">
                      <EditTransactionForm transaction={t} />
                      
                      {isTransfer ? (
                        <Button variant="ghost" size="icon" disabled title="Hapus transfer tidak didukung">
                          <Trash2 className="h-4 w-4 text-slate-300" />
                        </Button>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-500" disabled={isDeleting === t.id}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus Transaksi?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Apakah Anda yakin ingin menghapus transaksi ini? Saldo dompet akan disesuaikan kembali secara otomatis. Tindakan ini tidak dapat dibatalkan.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(t.id)}
                                className="bg-rose-600 hover:bg-rose-700 text-white"
                              >
                                {isDeleting === t.id ? 'Menghapus...' : 'Ya, Hapus'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
