'use client'

import { useState } from 'react'
import * as LucideIcons from 'lucide-react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'
import { BudgetCategory } from '@/actions/budgets'
import { BudgetProgress } from '@/components/dashboard/BudgetProgress'
import { cn } from '@/lib/utils'
import { UpcomingReminders } from '@/components/dashboard/UpcomingReminders'

interface DashboardWidgetsMobileProps {
  categoryChartData: { name: string; value: number; color: string }[]
  budgets: BudgetCategory[]
  upcomingRemindersCount: number
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function DashboardWidgetsMobile({
  categoryChartData,
  budgets,
  upcomingRemindersCount
}: DashboardWidgetsMobileProps) {
  const [activeDialog, setActiveDialog] = useState<string | null>(null)

  // Budget calculations
  const activeBudgets = budgets.filter((b) => b.budget_limit > 0)
  const totalBudgeted = activeBudgets.reduce((sum, b) => sum + b.budget_limit, 0)
  const totalSpent = activeBudgets.reduce((sum, b) => sum + b.spent, 0)
  const budgetPercentage = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0

  // Category breakdown calculations
  const topCategoryName = categoryChartData[0]?.name || 'Belum ada'

  // Dynamic budget progress bar color
  let budgetColorClass = 'bg-emerald-500'
  if (budgetPercentage >= 100) {
    budgetColorClass = 'bg-rose-600 animate-pulse'
  } else if (budgetPercentage >= 80) {
    budgetColorClass = 'bg-rose-500'
  } else if (budgetPercentage >= 70) {
    budgetColorClass = 'bg-amber-500'
  }

  return (
    <div className="grid grid-cols-2 gap-2 md:hidden">
      
      {/* 1. Anggaran Kategori */}
      <Dialog open={activeDialog === 'budget'} onOpenChange={(open) => setActiveDialog(open ? 'budget' : null)}>
        <DialogTrigger render={
          <Card className="cursor-pointer active:scale-98 transition-transform select-none hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_rgba(255,255,255,0.15)] min-h-[120px] flex flex-col justify-between p-2.5 border-2 border-black dark:border-white shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider truncate">
                  Anggaran
                </span>
                <LucideIcons.PiggyBank className="h-4 w-4 text-amber-500 shrink-0" />
              </div>
              {totalBudgeted > 0 ? (
                <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-1 font-mono truncate">
                  {formatRupiah(totalBudgeted)}
                </p>
              ) : (
                <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">
                  Mulai set
                </p>
              )}
            </div>

            <div className="space-y-1 mt-2">
              {totalBudgeted > 0 ? (
                <>
                  <div className="flex justify-between items-center text-[9px] font-bold text-slate-600 dark:text-slate-400 font-mono">
                    <span className="truncate">{formatRupiah(totalSpent)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-300", budgetColorClass)}
                      style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                    />
                  </div>
                </>
              ) : (
                <div className="text-[8px] text-slate-400 italic py-0.5 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-md">
                  Atur
                </div>
              )}
            </div>
          </Card>
        } />
        <DialogContent className="max-w-[95%] rounded-3xl p-5 bg-white dark:bg-zinc-900 border-2 border-black dark:border-white shadow-[8px_8px_0px_rgba(0,0,0,1)]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold dark:text-white">
              Ringkasan Anggaran
            </DialogTitle>
          </DialogHeader>
          <div className="pt-4">
            <BudgetProgress budgets={budgets} />
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. Pengingat Tagihan */}
      <Dialog open={activeDialog === 'reminders'} onOpenChange={(open) => setActiveDialog(open ? 'reminders' : null)}>
        <DialogTrigger render={
          <Card className="cursor-pointer active:scale-98 transition-transform select-none hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_rgba(255,255,255,0.15)] min-h-[120px] flex flex-col justify-between p-2.5 border-2 border-black dark:border-white shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider truncate">
                  Tagihan
                </span>
                <LucideIcons.Bell className={cn("h-4 w-4 shrink-0", upcomingRemindersCount > 0 ? "text-rose-500 animate-bounce" : "text-emerald-500")} />
              </div>
            </div>

            <div className="space-y-1.5 mt-2">
              {upcomingRemindersCount > 0 ? (
                <div className="flex flex-col items-center justify-center gap-0.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 py-1.5 rounded-lg border border-rose-100 dark:border-rose-950/40 text-[9px] font-bold text-center">
                  <LucideIcons.AlertTriangle className="h-3.5 w-3.5 shrink-0 mb-0.5 text-rose-500" />
                  <span>{upcomingRemindersCount} Tagihan</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-950/40 text-[9px] font-bold text-center">
                  <LucideIcons.CheckCircle2 className="h-3.5 w-3.5 shrink-0 mb-0.5 text-emerald-500" />
                  <span>Aman</span>
                </div>
              )}
            </div>
          </Card>
        } />
        <DialogContent className="max-w-[95%] rounded-3xl p-5 bg-white dark:bg-zinc-900 border-2 border-black dark:border-white shadow-[8px_8px_0px_rgba(0,0,0,1)]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold dark:text-white">
              Pengingat Mendatang
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <UpcomingReminders />
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
