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

import { AIBudgetPlan } from '@/actions/ai-budget'

interface DashboardWidgetsMobileProps {
  budgets: BudgetCategory[]
  upcomingRemindersCount: number
  aiPlan?: AIBudgetPlan | null
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
  upcomingRemindersCount,
  aiPlan
}: DashboardWidgetsMobileProps) {
  const [activeDialog, setActiveDialog] = useState<string | null>(null)

  // Budget calculations
  const activeBudgets = budgets.filter((b) => b.budget_limit > 0)
  const totalBudgeted = activeBudgets.reduce((sum, b) => sum + b.budget_limit, 0)
  const totalSpent = activeBudgets.reduce((sum, b) => sum + b.spent, 0)

  const handleOpenAiModal = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-fimo-ai'))
    }
  }

  return (
    <div className="grid grid-cols-3 gap-2 md:hidden">
      
      {/* 1. Anggaran Kategori */}
      <Dialog open={activeDialog === 'budget'} onOpenChange={(open) => setActiveDialog(open ? 'budget' : null)}>
        <DialogTrigger render={
          <Card className="cursor-pointer active:scale-98 transition-transform select-none hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] dark:hover:shadow-[1px_1px_0px_rgba(255,255,255,0.15)] min-h-[92px] flex flex-col justify-between p-2.5 sm:p-3 border-2 border-black dark:border-white bg-white dark:bg-zinc-900 text-black dark:text-white shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(255,255,255,0.15)] rounded-xl">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[10px] font-black font-mono uppercase tracking-wider truncate">
                  Anggaran
                </span>
                <LucideIcons.PiggyBank className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-black dark:text-white shrink-0" />
              </div>
              {totalBudgeted > 0 ? (
                <p className="text-[11px] sm:text-[12px] font-black font-mono mt-1 truncate">
                  {formatRupiah(totalSpent)}
                </p>
              ) : (
                <p className="text-[9px] text-black/60 dark:text-white/60 mt-1">
                  Belum diatur
                </p>
              )}
            </div>

            <div className="mt-1.5">
              {totalBudgeted > 0 ? (
                <div className="h-1.5 sm:h-2 w-full bg-slate-100 dark:bg-zinc-800 border border-black dark:border-white rounded-full overflow-hidden flex">
                  {activeBudgets.map((b) => {
                    const width = (b.budget_limit / totalBudgeted) * 100
                    return (
                      <div 
                        key={b.category_id}
                        className="h-full border-r border-black dark:border-white last:border-r-0"
                        style={{ width: `${width}%`, backgroundColor: b.category_color }}
                      />
                    )
                  })}
                </div>
              ) : (
                <div className="text-[8px] font-bold text-center border border-dashed border-black/40 dark:border-white/40 rounded-md py-0.5">
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
          <Card className="cursor-pointer active:scale-98 transition-transform select-none hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] dark:hover:shadow-[1px_1px_0px_rgba(255,255,255,0.15)] min-h-[92px] flex flex-col justify-between p-2.5 sm:p-3 border-2 border-black dark:border-white bg-white dark:bg-zinc-900 text-black dark:text-white shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(255,255,255,0.15)] rounded-xl">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[10px] font-black font-mono uppercase tracking-wider truncate">
                  Tagihan
                </span>
                <LucideIcons.Bell className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-black dark:text-white", upcomingRemindersCount > 0 && "animate-bounce")} />
              </div>
            </div>

            <div className="mt-1.5">
              {upcomingRemindersCount > 0 ? (
                <div className="flex items-center justify-center gap-1 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 py-1 px-1.5 rounded-lg border border-black dark:border-white text-[9px] font-black">
                  <LucideIcons.AlertTriangle className="h-3 w-3 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{upcomingRemindersCount}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 py-1 px-1.5 rounded-lg border border-black dark:border-white text-[9px] font-black">
                  <LucideIcons.CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
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

      {/* 3. Rencana AI (Compact Mobile Card) */}
      <Card 
        onClick={handleOpenAiModal}
        className="cursor-pointer active:scale-98 transition-transform select-none hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] min-h-[92px] flex flex-col justify-between p-2.5 sm:p-3 border-2 border-black bg-[#c5b0f4] text-black shadow-[3px_3px_0px_rgba(0,0,0,1)] rounded-xl"
      >
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[10px] font-black font-mono uppercase tracking-wider flex items-center gap-1 truncate">
              Rencana AI
            </span>
            <LucideIcons.Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-black shrink-0 fill-black/10" />
          </div>
          {totalBudgeted > 0 || !!aiPlan ? (
            <p className="text-[11px] sm:text-[12px] font-black font-mono mt-1 text-black truncate">
              {formatRupiah(totalBudgeted)}
            </p>
          ) : (
            <p className="text-[9px] font-bold text-black/70 mt-1 truncate">
              Belum diatur
            </p>
          )}
        </div>

        <div className="mt-1.5">
          {totalBudgeted > 0 || !!aiPlan ? (
            <div className="text-[8px] font-extrabold bg-black text-white py-0.5 px-1.5 rounded-full text-center truncate">
              Rencana Aktif
            </div>
          ) : (
            <div className="text-[8px] font-extrabold bg-black text-white py-0.5 px-1.5 rounded-full text-center truncate">
              Auto-Plan
            </div>
          )}
        </div>
      </Card>

    </div>
  )
}
