'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Sparkles, ArrowRight, CheckCircle2, Edit3, Save, PiggyBank, Lightbulb, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { AIBudgetPlan, applyAIBudgetPlanToBudgets } from '@/actions/ai-budget'
import { BudgetCategory } from '@/actions/budgets'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription
} from '@/components/ui/sheet'

interface AIBudgetDashboardHighlightProps {
  plan: AIBudgetPlan | null
  currentBudgets: BudgetCategory[]
  currentMonth: number
  currentYear: number
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function AIBudgetDashboardHighlight({
  plan,
  currentBudgets,
  currentMonth,
  currentYear
}: AIBudgetDashboardHighlightProps) {
  const [isPending, startTransition] = useTransition()
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Local state for editable plan limits
  const [editableLimits, setEditableLimits] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    if (plan?.budgets) {
      plan.budgets.forEach((item) => {
        initial[item.category_id] = item.recommended_limit
      })
    }
    return initial
  })

  const handleLimitChange = (catId: string, value: string) => {
    const num = Number(value.replace(/[^0-9]/g, '')) || 0
    setEditableLimits((prev) => ({ ...prev, [catId]: num }))
  }

  const handleDirectApplyPlan = () => {
    if (!plan || !plan.budgets || plan.budgets.length === 0) {
      toast.error('Tidak ada alokasi anggaran AI yang dapat diterapkan.')
      return
    }

    startTransition(async () => {
      const itemsToApply = plan.budgets.map((item) => ({
        category_id: item.category_id,
        limit_amount: item.recommended_limit
      }))

      const res = await applyAIBudgetPlanToBudgets(itemsToApply, currentMonth, currentYear)
      if (res.success) {
        toast.success(`Berhasil menerapkan 100% rekomendasi ${res.count || 0} anggaran AI ke Fimo!`)
      } else {
        toast.error(res.error || 'Gagal menerapkan anggaran AI.')
      }
    })
  }

  const handleApplyPlan = () => {
    if (!plan || !plan.budgets || plan.budgets.length === 0) {
      toast.error('Tidak ada alokasi anggaran AI yang dapat diterapkan.')
      return
    }

    startTransition(async () => {
      const itemsToApply = plan.budgets.map((item) => ({
        category_id: item.category_id,
        limit_amount: editableLimits[item.category_id] ?? item.recommended_limit
      }))

      const res = await applyAIBudgetPlanToBudgets(itemsToApply, currentMonth, currentYear)
      if (res.success) {
        toast.success(`Berhasil menerapkan ${res.count || 0} anggaran AI ke sistem Fimo!`)
        setIsModalOpen(false)
      } else {
        toast.error(res.error || 'Gagal menerapkan anggaran AI.')
      }
    })
  }

  if (!plan) {
    return (
      <div className="w-full bg-[#c5b0f4] text-black border-2 border-black dark:border-white rounded-2xl p-5 md:p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:translate-x-0.5 hover:translate-y-0.5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center shrink-0 border-2 border-black">
            <Sparkles className="h-6 w-6 text-amber-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest bg-black text-white px-2 py-0.5 rounded-full">
                AI Budget Planner
              </span>
              <span className="text-xs font-semibold opacity-75">Bulan Ini</span>
            </div>
            <h3 className="text-lg font-bold tracking-tight mt-0.5">Belum Ada Rencana Anggaran AI</h3>
            <p className="text-xs text-black/80 font-medium max-w-xl">
              Gunakan asisten Fimo AI untuk merencanakan alokasi anggaran bulanan & target menabung cerdas secara otomatis.
            </p>
          </div>
        </div>

        <Link href="/dashboard/ai-budget-planner" className="w-full md:w-auto">
          <Button
            className="w-full md:w-auto bg-black text-white hover:bg-zinc-800 font-bold rounded-full border-2 border-black shadow-[2px_2px_0px_rgba(255,255,255,0.3)] transition-all"
          >
            <span>Buat AI Plan Sekarang</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    )
  }

  const totalRecommended = plan.budgets?.reduce((sum, item) => sum + (editableLimits[item.category_id] ?? item.recommended_limit), 0) || 0

  return (
    <div className="w-full bg-[#c5b0f4] text-black border-2 border-black dark:border-white rounded-2xl p-4 sm:p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] space-y-4 transition-all hover:translate-x-0.5 hover:translate-y-0.5 duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/15 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black text-white flex items-center justify-center shrink-0 border-2 border-black shadow-xs">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-amber-300 fill-amber-300/20" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] sm:text-[10px] font-mono font-extrabold uppercase tracking-wider bg-black text-white px-2 py-0.5 rounded-full">
                AI Budget Assistant
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-950 bg-emerald-300/90 px-2 py-0.5 rounded-full border border-black/20 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Plan Aktif
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold tracking-tight mt-1 text-black">
              Rekomendasi Anggaran & Target AI
            </h2>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          {/* Tombol 1: Terapkan Langsung 100% Rekomendasi AI */}
          <Button
            size="sm"
            onClick={handleDirectApplyPlan}
            disabled={isPending}
            className="flex-1 sm:flex-none bg-black text-white hover:bg-neutral-800 font-bold rounded-full border-2 border-black shadow-[2px_2px_0px_rgba(255,255,255,0.3)] text-xs"
          >
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
            <span>{isPending ? 'Menerapkan...' : 'Terapkan Rekomendasi AI'}</span>
          </Button>

          {/* Tombol 2: Sesuaikan / Edit Plan (Buka Sheet) */}
          <Sheet open={isModalOpen} onOpenChange={setIsModalOpen}>
            <SheetTrigger render={
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none bg-white text-black border-2 border-black font-bold rounded-full hover:bg-neutral-100 shadow-[2px_2px_0px_rgba(0,0,0,1)] text-xs"
              >
                <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                <span>Sesuaikan / Edit</span>
              </Button>
            } />
            <SheetContent side="bottom" className="rounded-t-3xl p-6 bg-white dark:bg-neutral-950 border-t-2 border-l-2 border-r-2 border-black dark:border-white shadow-[0_-6px_0px_rgba(0,0,0,1)] max-h-[85vh] overflow-y-auto">
              <SheetHeader className="text-left pb-4 border-b border-border">
                <SheetTitle className="text-lg font-extrabold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-500" />
                  Edit & Terapkan AI Budget Plan
                </SheetTitle>
                <SheetDescription className="text-xs text-neutral-500">
                  Sesuaikan nominal rekomendasi batas anggaran per kategori di bawah ini sebelum menerapkannya ke Anggaran Fimo kamu.
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  {plan.budgets.map((item) => (
                    <div
                      key={item.category_id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-zinc-900"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                          {item.category_name}
                        </p>
                        <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                          {item.reason}
                        </p>
                      </div>
                      <div className="w-36 shrink-0">
                        <input
                          type="number"
                          value={editableLimits[item.category_id] ?? item.recommended_limit}
                          onChange={(e) => handleLimitChange(item.category_id, e.target.value)}
                          className="w-full text-right px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border-2 border-black dark:border-white bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-[#dceeb1] text-black border-2 border-black rounded-xl flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase">Total Anggaran Diterapkan:</span>
                  <span className="text-sm font-mono font-extrabold">{formatRupiah(totalRecommended)}</span>
                </div>

                <Button
                  onClick={handleApplyPlan}
                  disabled={isPending}
                  className="w-full bg-black text-white hover:bg-neutral-800 font-bold rounded-xl py-3 border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,0.3)] transition-all"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isPending ? 'Menerapkan ke Fimo...' : 'Simpan & Terapkan ke Budget Fimo'}
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <Link href="/dashboard/ai-budget-planner" className="flex-1 sm:flex-none">
            <Button
              size="sm"
              className="w-full bg-black text-white hover:bg-neutral-900 font-bold rounded-full border-2 border-black shadow-[2px_2px_0px_rgba(255,255,255,0.3)] text-xs"
            >
              <span>Halaman AI Planner</span>
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Insight & Strategy grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Main Strategic Summary */}
        <div className="p-3.5 bg-white/70 dark:bg-black/20 rounded-xl border border-black/10 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-black/70">
            <Lightbulb className="h-4 w-4 text-amber-700" />
            <span>Strategi Utama</span>
          </div>
          <p className="text-xs font-semibold leading-relaxed text-black/90">
            {plan.analysis?.summary || 'Rencana alokasi keuangan cerdas untuk menjaga pengeluaran bulanan tetap stabil.'}
          </p>
        </div>

        {/* Priority Action */}
        <div className="p-3.5 bg-white/70 dark:bg-black/20 rounded-xl border border-black/10 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-black/70">
            <ShieldAlert className="h-4 w-4 text-rose-700" />
            <span>Aksi Prioritas</span>
          </div>
          <p className="text-xs font-semibold leading-relaxed text-black/90">
            {plan.analysis?.priority_action || 'Prioritaskan pemangkasan pos pengeluaran sekunder.'}
          </p>
        </div>

        {/* Savings Projections Quick Preview */}
        <div className="p-3.5 bg-white/70 dark:bg-black/20 rounded-xl border border-black/10 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-black/70">
            <PiggyBank className="h-4 w-4 text-emerald-800" />
            <span>Target Menabung Cerdas</span>
          </div>
          {plan.savings_recommendations && plan.savings_recommendations.length > 0 ? (
            <div className="space-y-1 text-xs">
              <p className="font-bold text-black truncate">
                {plan.savings_recommendations[0].institution} ({plan.savings_recommendations[0].rate_pct}% p.a)
              </p>
              <div className="flex justify-between font-mono text-[11px] opacity-80">
                <span>Est 1 Thn:</span>
                <span className="font-bold">{formatRupiah(plan.savings_recommendations[0].projection_1yr)}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-black/80 font-medium">Alokasikan 10-20% pemasukan ke instrumen tabungan berimbal hasil stabil.</p>
          )}
        </div>
      </div>

      {/* Top 3 AI Recommended Categories Preview */}
      {plan.budgets && plan.budgets.length > 0 && (
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-black/70">
              Pratinjau Alokasi Kategori Utama
            </span>
            <span className="text-xs font-mono font-bold text-black">
              Total AI Limit: {formatRupiah(totalRecommended)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {plan.budgets.slice(0, 3).map((item) => (
              <div
                key={item.category_id}
                className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-black/15 flex items-center justify-between"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-xs font-bold text-black dark:text-white truncate">
                    {item.category_name}
                  </p>
                  <p className="text-[9px] text-neutral-500 dark:text-neutral-400 truncate">
                    {item.reason}
                  </p>
                </div>
                <span className="text-xs font-mono font-extrabold text-indigo-600 dark:text-indigo-400 shrink-0">
                  {formatRupiah(editableLimits[item.category_id] ?? item.recommended_limit)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
