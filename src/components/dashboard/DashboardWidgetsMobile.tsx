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
  budgets,
  upcomingRemindersCount
}: DashboardWidgetsMobileProps) {
  const [activeDialog, setActiveDialog] = useState<string | null>(null)

  // Budget calculations
  const activeBudgets = budgets.filter((b) => b.budget_limit > 0)
  const totalBudgeted = activeBudgets.reduce((sum, b) => sum + b.budget_limit, 0)
  const totalSpent = activeBudgets.reduce((sum, b) => sum + b.spent, 0)
  const budgetPercentage = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0

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
          <Card className="cursor-pointer active:scale-98 transition-transform select-none hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] dark:hover:shadow-[1px_1px_0px_rgba(255,255,255,0.15)] min-h-[92px] flex flex-col justify-between p-3 border-2 border-black dark:border-white bg-white dark:bg-zinc-900 text-black dark:text-white shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(255,255,255,0.15)] rounded-xl">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black font-mono uppercase tracking-wider">
                  Anggaran
                </span>
                <LucideIcons.PiggyBank className="h-4 w-4 text-black dark:text-white shrink-0" />
              </div>
              {totalBudgeted > 0 ? (
                <p className="text-[12px] font-black font-mono mt-1">
                  {formatRupiah(totalSpent)} <span className="text-[9px] font-medium text-black/60 dark:text-white/60">/ {formatRupiah(totalBudgeted)}</span>
                </p>
              ) : (
                <p className="text-[10px] text-black/60 dark:text-white/60 mt-1">
                  Belum diatur
                </p>
              )}
            </div>

            <div className="mt-2">
              {totalBudgeted > 0 ? (
                <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 border border-black dark:border-white rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all duration-300 border-r border-black dark:border-white", budgetColorClass)}
                    style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                  />
                </div>
              ) : (
                <div className="text-[9px] font-bold text-center border border-dashed border-black/40 dark:border-white/40 rounded-md py-0.5">
                  Atur Limit
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
          <Card className="cursor-pointer active:scale-98 transition-transform select-none hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] dark:hover:shadow-[1px_1px_0px_rgba(255,255,255,0.15)] min-h-[92px] flex flex-col justify-between p-3 border-2 border-black dark:border-white bg-white dark:bg-zinc-900 text-black dark:text-white shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(255,255,255,0.15)] rounded-xl">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black font-mono uppercase tracking-wider">
                  Tagihan
                </span>
                <LucideIcons.Bell className={cn("h-4 w-4 shrink-0 text-black dark:text-white", upcomingRemindersCount > 0 && "animate-bounce")} />
              </div>
            </div>

            <div className="mt-2">
              {upcomingRemindersCount > 0 ? (
                <div className="flex items-center justify-center gap-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 py-1 px-2.5 rounded-lg border border-black dark:border-white text-[10px] font-black">
                  <LucideIcons.AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{upcomingRemindersCount} Tagihan</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 py-1 px-2.5 rounded-lg border border-black dark:border-white text-[10px] font-black">
                  <LucideIcons.CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
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
