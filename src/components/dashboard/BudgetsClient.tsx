'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import * as LucideIcons from 'lucide-react'
import { cn } from '@/lib/utils'
import { BudgetCategory, copyBudgetsFromPreviousMonth } from '@/actions/budgets'
import { generateAIBudgetPlan, applyAIBudgetPlanToBudgets, AIBudgetPlan } from '@/actions/ai-budget'
import { BudgetForm } from '@/components/dashboard/BudgetForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface BudgetsClientProps {
  initialBudgets: BudgetCategory[]
  initialCachedPlan?: AIBudgetPlan | null
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

export function BudgetsClient({ initialBudgets, initialCachedPlan, month, year }: BudgetsClientProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const [plan, setPlan] = useState<AIBudgetPlan | null>(initialCachedPlan || null)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [reviewMode, setReviewMode] = useState(false)
  const [draftBudgets, setDraftBudgets] = useState<Record<string, number>>({})

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
      } catch (error) {
        console.error('Error copying budgets:', error)
        toast.error('Terjadi kesalahan sistem saat menyalin anggaran.')
      }
    })
  }

  const handleAutoPilot = async () => {
    setIsGeneratingAI(true)
    try {
      const res = await generateAIBudgetPlan(month, year)
      if (res.success && res.data) {
        setPlan(res.data)
        
        // Populate draft mode
        const newDrafts: Record<string, number> = {}
        res.data.budgets.forEach((item) => {
          newDrafts[item.category_id] = item.recommended_limit
        })
        setDraftBudgets(newDrafts)
        setReviewMode(true)
        toast.success('Rencana AI berhasil dibuat! Silakan sesuaikan draf di bawah ini.')
      } else {
        toast.error(res.error || 'Gagal menghasilkan rencana AI.')
      }
    } catch (err) {
      console.error('Error auto-pilot:', err)
      toast.error('Terjadi kesalahan sistem saat Auto-Pilot.')
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const handleApplyDraft = async () => {
    setIsGeneratingAI(true)
    try {
      const itemsToApply = Object.entries(draftBudgets).map(([category_id, limit_amount]) => {
        const name = plan?.budgets?.find(b => b.category_id === category_id)?.category_name
        return { category_id, category_name: name, limit_amount }
      })
      const applyRes = await applyAIBudgetPlanToBudgets(itemsToApply, month, year)
      if (applyRes.success) {
        toast.success(`Berhasil! ${applyRes.count} anggaran telah diterapkan.`)
        setReviewMode(false)
        router.refresh()
      } else {
        toast.error(applyRes.error || 'Gagal menerapkan anggaran AI.')
      }
    } catch (err) {
      console.error('Error applying draft:', err)
      toast.error('Terjadi kesalahan sistem saat menyimpan draf.')
    } finally {
      setIsGeneratingAI(false)
    }
  }

  // Filter budgets
  const displayBudgets = initialBudgets.filter((b) =>
    b.category_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (reviewMode && plan) {
    plan.budgets.forEach(aiBudget => {
      if (aiBudget.category_id.startsWith('new-') && !displayBudgets.find(b => b.category_id === aiBudget.category_id)) {
        displayBudgets.push({
          category_id: aiBudget.category_id,
          category_name: aiBudget.category_name,
          category_icon: 'Sparkles',
          category_color: '#c5b0f4',
          budget_id: null,
          budget_limit: 0,
          spent: 0,
          budget_notes: 'Rekomendasi AI'
        } as BudgetCategory)
      }
    })
  }

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-950 p-4 rounded-xl border-2 border-black dark:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)]">
        {/* Month Selector Row */}
        <div className="flex items-center justify-center sm:justify-start gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => changeMonth('prev')}
            className="rounded-full border-slate-200 dark:border-slate-800 w-9 h-9 flex items-center justify-center p-0 shrink-0"
            disabled={reviewMode}
          >
            <LucideIcons.ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center min-w-[140px]">
            <h2 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
              {INDONESIAN_MONTHS[month - 1]} {year}
            </h2>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => changeMonth('next')}
            className="rounded-full border-slate-200 dark:border-slate-800 w-9 h-9 flex items-center justify-center p-0 shrink-0"
            disabled={reviewMode}
          >
            <LucideIcons.ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {reviewMode ? (
            <>
              <Button
                variant="outline"
                onClick={() => setReviewMode(false)}
                className="rounded-full border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold"
                disabled={isGeneratingAI}
              >
                Batal
              </Button>
              <Button
                onClick={handleApplyDraft}
                disabled={isGeneratingAI}
                className="rounded-full bg-black text-white hover:bg-neutral-800 text-xs font-bold shadow-[2px_2px_0px_rgba(255,255,255,0.3)] border-2 border-black"
              >
                {isGeneratingAI ? <LucideIcons.Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                Terapkan Anggaran
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleCopyBudgets}
                className="rounded-full border-slate-200 dark:border-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 w-full sm:w-auto px-4 py-2.5 sm:py-2"
                disabled={isPending || isGeneratingAI}
              >
                <LucideIcons.Copy className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Salin Anggaran</span>
                <span className="sm:hidden">Salin</span>
              </Button>

              <Button
                onClick={handleAutoPilot}
                disabled={isPending || isGeneratingAI}
                className="rounded-full bg-[#c5b0f4] text-black hover:bg-[#b097e8] text-xs font-bold flex items-center justify-center gap-1.5 w-full sm:w-auto px-4 py-2.5 sm:py-2 border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all"
              >
                {isGeneratingAI ? (
                  <LucideIcons.Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LucideIcons.Sparkles className="h-3.5 w-3.5 text-black" />
                )}
                <span>Fimo Auto-Pilot</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Summary Card */}
      {totalBudgeted > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#c8e6cd] text-black border-2 border-black dark:border-white p-6 rounded-xl shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)]">
          <div className="space-y-1">
            <span className="text-[10px] font-bold font-mono text-emerald-900 uppercase tracking-wider">
              Total Dianggarkan
            </span>
            <h3 className="text-xl md:text-2xl font-extrabold text-black">
              {formatRupiah(totalBudgeted)}
            </h3>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold font-mono text-emerald-900 uppercase tracking-wider">
              Total Terpakai (Pada Anggaran)
            </span>
            <h3 className="text-xl md:text-2xl font-extrabold text-black">
              {formatRupiah(totalSpent)}
            </h3>
          </div>
          <div className="space-y-2 flex flex-col justify-center">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
              <span>Rasio Pemakaian</span>
              <span>{overallPercentage}%</span>
            </div>
            <div className="h-2.5 w-full bg-black/10 rounded-full overflow-hidden border border-black/10">
              <div 
                className="h-full bg-emerald-700 rounded-full transition-all duration-500" 
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
          className="pl-10 pr-10 py-5 rounded-2xl bg-white dark:bg-zinc-950 border-2 border-black dark:border-white focus-visible:ring-0 focus-visible:border-black dark:focus-visible:border-white transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(255,255,255,0.15)] text-sm"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 hover:bg-slate-100 dark:hover:bg-zinc-800 p-1 rounded-full text-slate-400 transition-colors"
          >
            <LucideIcons.X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Categories / Budgets List */}
      {displayBudgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center bg-slate-50/50 dark:bg-zinc-900/30 rounded-3xl border border-dashed border-slate-200 dark:border-zinc-800 transition-all">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {displayBudgets.map((b) => {
            const currentLimit = reviewMode ? (draftBudgets[b.category_id] ?? b.budget_limit) : b.budget_limit
            const hasBudget = currentLimit > 0
            const percentage = hasBudget ? Math.round((b.spent / currentLimit) * 100) : 0
            
            // Dynamic Color Selection based on percentage
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
                  "p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between min-h-[125px] sm:min-h-[140px]",
                  reviewMode 
                    ? "bg-[#f4f0fa] dark:bg-[#1a1428] border-[#c5b0f4] shadow-[4px_4px_0px_rgba(197,176,244,1)] scale-[1.01]" 
                    : "bg-white dark:bg-zinc-950 border-black dark:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_rgba(255,255,255,0.15)]",
                  !hasBudget && !reviewMode && "opacity-75 hover:opacity-100"
                )}
              >
                {/* Upper row: Icon, Category Name, Action Trigger */}
                <div className="flex items-start justify-between w-full">
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                    <div 
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border shadow-xs shrink-0"
                      style={{ 
                        backgroundColor: `${b.category_color}12`,
                        color: b.category_color,
                        borderColor: `${b.category_color}25`
                      }}
                    >
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate flex items-center gap-1">
                        {b.category_name}
                        {b.category_id.startsWith('new-') && (
                          <span className="bg-[#c5b0f4] text-black text-[8px] px-1.5 py-0.5 rounded-full uppercase tracking-wider">Baru</span>
                        )}
                      </h4>
                      {b.budget_notes && (
                        <p className="text-[8px] sm:text-[10px] text-slate-400 dark:text-slate-500 italic truncate max-w-[120px] mt-0.5">
                          &quot;{b.budget_notes}&quot;
                        </p>
                      )}
                    </div>
                  </div>

                  {!reviewMode && (
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
                          className="h-7 w-7 sm:h-8 sm:w-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0"
                        >
                          {b.budget_limit > 0 ? (
                            <LucideIcons.Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          ) : (
                            <LucideIcons.Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          )}
                        </Button>
                      }
                    />
                  )}
                </div>

                {/* Lower row: Details & Progress bar */}
                <div className="mt-3.5 sm:mt-5 space-y-1.5 sm:space-y-2">
                  {reviewMode ? (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide flex justify-between">
                        <span>Anggaran {b.category_id.startsWith('new-') ? 'Baru' : ''}</span>
                        {plan?.budgets?.find(ab => ab.category_id === b.category_id) && (
                          <span className="text-[#8c52ff] flex items-center gap-1">
                            <LucideIcons.Sparkles className="h-3 w-3" /> AI Saran: {formatRupiah(plan.budgets.find(ab => ab.category_id === b.category_id)!.recommended_limit)}
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Rp</span>
                        <Input
                          type="text"
                          value={draftBudgets[b.category_id] ?? b.budget_limit}
                          onChange={(e) => {
                            const val = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0
                            setDraftBudgets(prev => ({ ...prev, [b.category_id]: val }))
                          }}
                          className="pl-8 py-2 h-9 text-sm font-black bg-white dark:bg-zinc-950 border-2 border-[#c5b0f4] rounded-lg shadow-[2px_2px_0px_rgba(197,176,244,1)] focus-visible:ring-0 focus-visible:border-black"
                        />
                      </div>
                    </div>
                  ) : hasBudget ? (
                    <>
                      <div className="flex justify-between items-end text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
                        <div className="flex flex-col pr-1">
                          <div className="truncate">
                            <span className="text-slate-800 dark:text-slate-100 font-extrabold">
                              {formatRupiah(b.spent)}
                            </span>
                            <span className="text-slate-400 dark:text-slate-600 font-normal text-[8px] sm:text-[10px] mx-0.5 sm:mx-1">/</span>
                            <span className="font-semibold text-slate-500 dark:text-slate-400">
                              {formatRupiah(b.budget_limit)}
                            </span>
                          </div>
                        </div>
                        <span className={cn(
                          "px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-extrabold border shrink-0",
                          badgeColorClass
                        )}>
                          {percentage}%
                        </span>
                      </div>
                      <div className="h-1.5 sm:h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-500", progressBgColor)} 
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between text-[10px] sm:text-xs py-0.5">
                      <span className="text-slate-400 dark:text-slate-500 font-medium truncate pr-1">
                        Belum diatur
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
                            className="rounded-full text-[8px] sm:text-[10px] h-6 sm:h-7 border-dashed border-slate-200 dark:border-slate-800 text-slate-500 px-2 sm:px-3"
                          >
                            Atur
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

      {/* Savings Simulation */}
      {plan?.savings_recommendations && plan.savings_recommendations.length > 0 && (
        <div className="bg-[#efd4d4] text-black border-2 border-black p-6 rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)] space-y-6 mt-8">
          <div>
            <h4 className="text-lg font-black flex items-center gap-2">
              <LucideIcons.Calculator className="h-5 w-5" />
              Fimo Coach: Simulasi Tabungan
            </h4>
            <p className="text-xs font-semibold opacity-80 mt-1">
              Berdasarkan analisis sisa anggaranmu, berikut proyeksi dari rekomendasi bank pilihan AI.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plan.savings_recommendations.map((sav) => (
              <div
                key={sav.institution}
                className="p-4 rounded-xl border-2 border-black bg-white transition-all flex flex-col justify-between gap-3 shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900">
                      {sav.institution}
                    </span>
                    <span className="text-[9px] font-bold font-mono uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                      {sav.type === 'bank' ? '🏦 Bank Digital' : '📈 Reksa/SBN'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {sav.description}
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-black/10 pt-3">
                  <div className="text-left">
                    <span className="text-[10px] font-bold text-slate-400 block font-mono">Bunga:</span>
                    <span className="text-sm font-black text-indigo-500">
                      {sav.rate_pct}% p.a.
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 block font-mono">Proyeksi 1 Thn:</span>
                    <span className="text-sm font-black text-black">
                      {formatRupiah(sav.projection_1yr || 0)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

