'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Trash2, FilterX, Search, SlidersHorizontal, Tag, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

  // Filters State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [minAmount, setMinAmount] = useState<string>('')
  const [maxAmount, setMaxAmount] = useState<string>('')
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | '7days' | '30days' | 'custom'>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [showAdvanced, setShowAdvanced] = useState(false)

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

  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedTag(null)
    setMinAmount('')
    setMaxAmount('')
    setDateRangeFilter('all')
    setStartDate('')
    setEndDate('')
    router.push('/dashboard/transactions')
  }

  // Extract unique tags from fetched transactions
  const allTags = Array.from(
    new Set(
      transactions.flatMap(t => t.tags || [])
    )
  ).filter(Boolean) as string[]

  // Filter transactions on client side for live search and range queries
  const filteredTransactions = transactions.filter(t => {
    // 1. Search Query Filter (Description & Notes)
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const descMatch = t.description?.toLowerCase().includes(query)
      const notesMatch = t.notes?.toLowerCase().includes(query)
      if (!descMatch && !notesMatch) return false
    }

    // 2. Tag Filter
    if (selectedTag) {
      if (!t.tags || !t.tags.includes(selectedTag)) return false
    }

    // 3. Amount Range Filter
    const amount = Number(t.amount)
    if (minAmount && !isNaN(Number(minAmount))) {
      if (amount < Number(minAmount)) return false
    }
    if (maxAmount && !isNaN(Number(maxAmount))) {
      if (amount > Number(maxAmount)) return false
    }

    // 4. Date Range Filter
    if (dateRangeFilter !== 'all') {
      const itemDate = new Date(t.transaction_date)
      const today = new Date()
      
      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const itemMidnight = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate())
      
      const diffTime = todayMidnight.getTime() - itemMidnight.getTime()
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

      if (dateRangeFilter === 'today') {
        if (diffDays !== 0) return false
      } else if (dateRangeFilter === '7days') {
        if (diffDays < 0 || diffDays > 6) return false
      } else if (dateRangeFilter === '30days') {
        if (diffDays < 0 || diffDays > 29) return false
      } else if (dateRangeFilter === 'custom') {
        const itemDateStr = t.transaction_date.split('T')[0]
        if (startDate) {
          if (itemDateStr < startDate) return false
        }
        if (endDate) {
          if (itemDateStr > endDate) return false
        }
      }
    }

    return true
  })

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

  const dateRangeOptions = [
    { value: 'all', label: 'Semua Waktu' },
    { value: 'today', label: 'Hari Ini' },
    { value: '7days', label: '7 Hari Terakhir' },
    { value: '30days', label: '30 Hari Terakhir' },
    { value: 'custom', label: 'Kustom Tanggal...' },
  ]

  const hasActiveFilters = 
    currentType !== 'all' || 
    currentWallet !== 'all' || 
    searchQuery !== '' || 
    selectedTag !== null || 
    minAmount !== '' || 
    maxAmount !== '' ||
    dateRangeFilter !== 'all' ||
    startDate !== '' ||
    endDate !== ''

  return (
    <div className="space-y-6">
      {/* Search and Quick Filters */}
      <div className="bg-white dark:bg-card p-4 rounded-2xl border-2 border-black dark:border-white space-y-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)]">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Global Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari deskripsi atau catatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl border-neutral-200 dark:border-neutral-800"
            />
          </div>

          {/* Quick Dropdowns */}
          <div className="flex flex-wrap sm:flex-nowrap gap-3">
            <div className="w-full sm:w-36">
              <InlineSelect 
                options={typeOptions}
                value={currentType}
                onChange={(val) => handleFilterChange('type', val)}
              />
            </div>
            <div className="w-full sm:w-44">
              <InlineSelect 
                options={walletOptions}
                value={currentWallet}
                onChange={(val) => handleFilterChange('wallet', val)}
              />
            </div>
            <div className="w-full sm:w-44">
              <InlineSelect 
                options={dateRangeOptions}
                value={dateRangeFilter}
                onChange={(val) => setDateRangeFilter(val as 'all' | 'today' | '7days' | '30days' | 'custom')}
              />
            </div>

            {/* Toggle Advanced Filters Button */}
            <Button
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`rounded-xl border-neutral-200 dark:border-neutral-800 gap-2 ${
                showAdvanced ? 'bg-neutral-100 dark:bg-neutral-800' : ''
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filter</span>
            </Button>

            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                onClick={handleResetFilters}
                className="text-muted-foreground hover:text-rose-550 rounded-xl"
              >
                <FilterX className="w-4 h-4 mr-2" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Custom Date Picker Inputs */}
        {dateRangeFilter === 'custom' && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-neutral-50 dark:bg-zinc-900/40 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 animate-in fade-in slide-in-from-top-1 duration-150">
            <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 shrink-0">Rentang Tanggal Kustom:</span>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 w-full sm:w-auto">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-xl border-neutral-200 dark:border-neutral-800 text-xs w-full sm:w-36 py-1 h-8 bg-white dark:bg-zinc-900 text-center"
              />
              <span className="text-muted-foreground text-xs px-1">s/d</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-xl border-neutral-200 dark:border-neutral-800 text-xs w-full sm:w-36 py-1 h-8 bg-white dark:bg-zinc-900 text-center"
              />
            </div>
          </div>
        )}

        {/* Collapsible Advanced Filters Panel */}
        {showAdvanced && (
          <div className="pt-4 border-t border-border space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Amount Range Filter */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  Rentang Nominal (IDR)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    className="rounded-xl border-neutral-200 dark:border-neutral-800 text-sm"
                  />
                  <span className="text-muted-foreground text-xs">—</span>
                  <Input
                    type="number"
                    placeholder="Maks"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    className="rounded-xl border-neutral-200 dark:border-neutral-800 text-sm"
                  />
                </div>
              </div>

              {/* Tag Pills Filter */}
              {allTags.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" />
                    Filter Tag
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                          selectedTag === tag
                            ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Transactions List */}
      <div className="bg-card dark:bg-card rounded-2xl border-2 border-black dark:border-white overflow-hidden shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)]">
        {filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="font-medium">Tidak ada transaksi ditemukan.</p>
            <p className="text-sm mt-1">Coba sesuaikan kata kunci atau filter lanjutan Anda.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredTransactions.map((t) => {
              const categoryColor = t.categories?.color || '#94a3b8'
              const categoryIcon = t.categories?.icon || (t.type === 'transfer' ? '🔄' : '📄')
              const categoryName = t.categories?.name || (t.type === 'transfer' ? 'Transfer' : 'Lainnya')
              const isTransfer = t.type === 'transfer'

              return (
                <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-secondary/40 dark:hover:bg-secondary/40 transition-colors gap-4">
                  
                  {/* Left info */}
                  <div className="flex items-center gap-4">
                    <div 
                      className="h-12 w-12 rounded-[1rem] flex items-center justify-center text-xl shadow-xs border border-border flex-shrink-0"
                      style={{ backgroundColor: `${categoryColor}15`, color: categoryColor }}
                    >
                      <span>{categoryIcon}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground line-clamp-1">
                        {t.description || categoryName}
                      </p>
                      
                      <div className="flex flex-wrap items-center text-xs text-muted-foreground mt-1 gap-2">
                        <span className="font-medium bg-secondary px-2 py-0.5 rounded-md">
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

                      {/* Display Tags */}
                      {t.tags && t.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {t.tags.map((tag: string) => (
                            <span 
                              key={tag} 
                              className="text-[10px] bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 px-2 py-0.5 rounded-full font-medium"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Right Actions & Amount */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full pl-16 sm:pl-0">
                    <p className={`font-bold whitespace-nowrap ${t.type === 'income' ? 'text-emerald-600' : isTransfer ? 'text-blue-600' : 'text-foreground'}`}>
                      {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}{formatCurrency(t.amount)}
                    </p>
                    
                    <div className="flex items-center gap-1 border border-border rounded-lg bg-card dark:bg-background p-0.5">
                      <EditTransactionForm transaction={t} />
                      
                      {isTransfer ? (
                        <Button variant="ghost" size="icon" disabled title="Hapus transfer tidak didukung">
                          <Trash2 className="h-4 w-4 text-muted-foreground/50" />
                        </Button>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-muted-foreground" disabled={isDeleting === t.id}>
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
