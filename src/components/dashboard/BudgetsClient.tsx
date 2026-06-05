'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import * as LucideIcons from 'lucide-react'
import { cn } from '@/lib/utils'
import { BudgetCategory, copyBudgetsFromPreviousMonth } from '@/actions/budgets'
import { BudgetForm } from '@/components/dashboard/BudgetForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface BudgetsClientProps {
  initialBudgets: BudgetCategory[]
  month: number
  year: number
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

export function BudgetsClient({ initialBudgets, month, year }: BudgetsClientProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [isPending, startTransition] = useTransition()

  // Handle month change
  const changeMonth = (direction: 'prev' | 'next') => {
    let nextMonth = month
    let nextYear = year

    if (direction === 'prev') {
      nextMonth -= 1
      if (nextMonth === 0) {
        nextMonth = 12
        nextYear -= 1
      }
    } else {
      nextMonth += 1
      if (nextMonth === 13) {
        nextMonth = 1
        nextYear += 1
      }
    }

    router.push(`/dashboard/budgets?month=${nextMonth}&year=${nextYear}`)
  }

  // Handle copying budgets from previous month
  const handleCopyBudgets = () => {
    startTransition(async () => {
      try {
        const res = await copyBudgetsFromPreviousMonth(month, year)
        if (res.success) {
          toast.success(`Berhasil menyalin ${res.count} anggaran dari bulan lalu.`)
          router.refresh()
        } else {
          toast.error(res.error || 'Gagal menyalin anggaran.')
        }
      } catch (err) {
        toast.error('Terjadi kesalahan sistem saat menyalin anggaran.')
      }
    })
  }

  // Filter budgets
  const filteredBudgets = initialBudgets.filter((b) =>
    b.category_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Total Summary
  const totalBudgeted = initialBudgets.reduce((sum, b) => sum + b.budget_limit, 0)
  const totalSpent = initialBudgets.reduce((sum, b) => sum + (b.budget_limit > 0 ? b.spent : 0), 0)
  const overallPercentage = totalBudgeted > 0 ? Math.min(Math.round((totalSpent / totalBudgeted) * 100), 100) : 0

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 pb-28 md:pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight dark:text-white">Anggaran Bulanan</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Kelola batas anggaran belanja untuk setiap kategori pengeluaran Anda.
          </p>
        </div>
      </div>

      {/* Month Navigation & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => changeMonth('prev')}
            className="rounded-full border-slate-200 dark:border-slate-800 w-9 h-9 flex items-center justify-center p-0"
          >
            <LucideIcons.ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center min-w-[130px]">
            <h2 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
              {INDONESIAN_MONTHS[month - 1]} {year}
            </h2>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => changeMonth('next')}
            className="rounded-full border-slate-200 dark:border-slate-800 w-9 h-9 flex items-center justify-center p-0"
          >
            <LucideIcons.ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleCopyBudgets}
            className="rounded-full border-slate-200 dark:border-slate-800 text-xs font-semibold flex items-center space-x-1.5 w-full sm:w-auto px-4 py-2"
            disabled={isPending}
          >
            <LucideIcons.Copy className="h-3.5 w-3.5" />
            <span>Salin Anggaran Bulan Lalu</span>
          </Button>
        </div>
      </div>

      {/* Stats Summary Card */}
      {totalBudgeted > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/60 dark:border-emerald-950/50 p-6 rounded-2xl">
          <div className="space-y-1">
            <span className="text-[10px] font-bold font-mono text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
              Total Dianggarkan
            </span>
            <h3 className="text-xl md:text-2xl font-extrabold text-emerald-900 dark:text-emerald-300">
              {formatRupiah(totalBudgeted)}
            </h3>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold font-mono text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
              Total Terpakai (Pada Anggaran)
            </span>
            <h3 className="text-xl md:text-2xl font-extrabold text-emerald-900 dark:text-emerald-300">
              {formatRupiah(totalSpent)}
            </h3>
          </div>
          <div className="space-y-2 flex flex-col justify-center">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-400">
              <span>Rasio Pemakaian</span>
              <span>{overallPercentage}%</span>
            </div>
            <div className="h-2 w-full bg-emerald-100 dark:bg-emerald-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-500" 
                style={{ width: `${overallPercentage}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <LucideIcons.Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
        <Input
          type="text"
          placeholder="Cari kategori anggaran..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10 py-5 rounded-2xl bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 focus-visible:ring-emerald-500 transition-all shadow-xs text-sm"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded-full text-slate-400 transition-colors"
          >
            <LucideIcons.X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Categories / Budgets List */}
      {filteredBudgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center bg-slate-50/50 dark:bg-slate-900/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 transition-all">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
            <LucideIcons.Inbox className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Tidak Ditemukan Anggaran</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
            {searchQuery 
              ? `Tidak ditemukan kategori anggaran dengan kata kunci "${searchQuery}"`
              : 'Belum ada kategori anggaran tersedia.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBudgets.map((b) => {
            const hasBudget = b.budget_limit > 0
            const percentage = hasBudget ? Math.round((b.spent / b.budget_limit) * 100) : 0
            
            // Dynamic Color Selection based on percentage
            // < 70% : Emerald (green)
            // 70% - 80% : Amber (yellow/orange)
            // >= 80% and < 100%: Rose (red)
            // >= 100%: Red/rose pulsing
            let progressBgColor = 'bg-emerald-500'
            let badgeColorClass = 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-950/50'
            
            if (percentage >= 100) {
              progressBgColor = 'bg-rose-600 animate-pulse'
              badgeColorClass = 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-950/50'
            } else if (percentage >= 80) {
              progressBgColor = 'bg-rose-500'
              badgeColorClass = 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-950/50'
            } else if (percentage >= 70) {
              progressBgColor = 'bg-amber-500'
              badgeColorClass = 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-950/50'
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const Icon = (LucideIcons as any)[b.category_icon] || LucideIcons.Tag

            return (
              <div 
                key={b.category_id}
                className={cn(
                  "p-5 bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-300 flex flex-col justify-between min-h-[140px] shadow-xs hover:shadow-md",
                  hasBudget ? "border-slate-100 dark:border-slate-800/80" : "border-slate-100 dark:border-slate-800/80 opacity-75 hover:opacity-100"
                )}
              >
                {/* Upper row: Icon, Category Name, Action Trigger */}
                <div className="flex items-start justify-between w-full">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center border shadow-xs"
                      style={{ 
                        backgroundColor: `${b.category_color}12`,
                        color: b.category_color,
                        borderColor: `${b.category_color}25`
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                        {b.category_name}
                      </h4>
                      {b.budget_notes && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 italic truncate max-w-[200px] mt-0.5">
                          &quot;{b.budget_notes}&quot;
                        </p>
                      )}
                    </div>
                  </div>

                  <BudgetForm
                    categoryId={b.category_id}
                    categoryName={b.category_name}
                    categoryIcon={b.category_icon}
                    categoryColor={b.category_color}
                    currentLimit={b.budget_limit}
                    currentNotes={b.budget_notes}
                    month={month}
                    year={year}
                    trigger={
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0"
                      >
                        {hasBudget ? (
                          <LucideIcons.Edit2 className="h-4 w-4" />
                        ) : (
                          <LucideIcons.Plus className="h-4 w-4" />
                        )}
                      </Button>
                    }
                  />
                </div>

                {/* Lower row: Details & Progress bar */}
                <div className="mt-5 space-y-2">
                  {hasBudget ? (
                    <>
                      <div className="flex justify-between items-end text-xs font-bold text-slate-500 dark:text-slate-400">
                        <div>
                          <span className="text-slate-800 dark:text-slate-100 font-extrabold">
                            {formatRupiah(b.spent)}
                          </span>
                          <span className="text-slate-400 dark:text-slate-600 font-normal text-[10px] mx-1">dari</span>
                          <span className="font-semibold text-slate-600 dark:text-slate-300">
                            {formatRupiah(b.budget_limit)}
                          </span>
                        </div>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-extrabold border",
                          badgeColorClass
                        )}>
                          {percentage}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-500", progressBgColor)} 
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between text-xs py-1">
                      <span className="text-slate-400 dark:text-slate-500 font-medium">
                        Belum ada batas anggaran diatur
                      </span>
                      <BudgetForm
                        categoryId={b.category_id}
                        categoryName={b.category_name}
                        categoryIcon={b.category_icon}
                        categoryColor={b.category_color}
                        currentLimit={b.budget_limit}
                        currentNotes={b.budget_notes}
                        month={month}
                        year={year}
                        trigger={
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="rounded-full text-[10px] h-7 border-dashed border-slate-200 dark:border-slate-800 text-slate-500 px-3"
                          >
                            Atur Anggaran
                          </Button>
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
