'use client'

import Link from 'next/link'
import * as LucideIcons from 'lucide-react'
import { cn } from '@/lib/utils'
import { BudgetCategory } from '@/actions/budgets'
import { Button } from '@/components/ui/button'

interface BudgetProgressProps {
  budgets: BudgetCategory[]
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function BudgetProgress({ budgets }: BudgetProgressProps) {
  // Filter only categories that have an active budget limit
  const activeBudgets = budgets.filter((b) => b.budget_limit > 0)

  if (activeBudgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center bg-slate-50/50 dark:bg-zinc-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800">
        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
          <LucideIcons.PiggyBank className="h-5 w-5 text-slate-400" />
        </div>
        <h4 className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Belum Ada Anggaran</h4>
        <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] leading-relaxed">
          Atur anggaran belanja bulanan Anda untuk mengontrol pengeluaran lebih baik.
        </p>
        <Link href="/dashboard/budgets" className="mt-3 w-full">
          <Button variant="outline" size="sm" className="w-full text-xs rounded-full h-8 px-4">
            Mulai Buat Anggaran
          </Button>
        </Link>
      </div>
    )
  }

  // Calculate totals
  const totalBudgeted = activeBudgets.reduce((sum, b) => sum + b.budget_limit, 0)
  const totalSpent = activeBudgets.reduce((sum, b) => sum + b.spent, 0)
  const overallPercentage = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0

  // Sort by consumption percentage descending to show the most critical budgets (top 3)
  const criticalBudgets = [...activeBudgets]
    .map((b) => ({
      ...b,
      percentage: Math.round((b.spent / b.budget_limit) * 100)
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3)

  return (
    <div className="space-y-5">
      {/* Overall Summary */}
      <div className="space-y-2">
        <div className="flex justify-between items-end">
          <div>
            <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest block">
              Penggunaan Anggaran
            </span>
            <span className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-1 block">
              {formatRupiah(totalSpent)} <span className="text-slate-400 text-xs font-normal">dari {formatRupiah(totalBudgeted)}</span>
            </span>
          </div>
          <span className={cn(
            "text-xs font-extrabold px-2 py-0.5 rounded-full border",
            overallPercentage >= 100 
              ? "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-950/50"
              : overallPercentage >= 80 
              ? "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/10 dark:text-rose-400"
              : "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-950/50"
          )}>
            {overallPercentage}%
          </span>
        </div>
        <div className="h-2.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-500",
              overallPercentage >= 100 
                ? "bg-rose-600" 
                : overallPercentage >= 80 
                ? "bg-rose-500" 
                : "bg-emerald-500"
            )}
            style={{ width: `${Math.min(overallPercentage, 100)}%` }}
          />
        </div>
      </div>

      <div className="h-px bg-slate-100 dark:bg-zinc-800" />

      {/* Critical Budgets list */}
      <div className="space-y-3.5">
        <h5 className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest">
          Anggaran Kritis
        </h5>
        <div className="space-y-3">
          {criticalBudgets.map((b) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const Icon = (LucideIcons as any)[b.category_icon] || LucideIcons.Tag
            
            let barColor = 'bg-emerald-500'
            let textColor = 'text-emerald-600 dark:text-emerald-400'
            if (b.percentage >= 100) {
              barColor = 'bg-rose-600 animate-pulse'
              textColor = 'text-rose-600 dark:text-rose-400'
            } else if (b.percentage >= 80) {
              barColor = 'bg-rose-500'
              textColor = 'text-rose-500 dark:text-rose-400'
            } else if (b.percentage >= 70) {
              barColor = 'bg-amber-500'
              textColor = 'text-amber-500 dark:text-amber-400'
            }

            return (
              <div key={b.category_id} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center border shrink-0"
                      style={{ 
                        backgroundColor: `${b.category_color}10`,
                        color: b.category_color,
                        borderColor: `${b.category_color}20`
                      }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                      {b.category_name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-slate-400 text-[10px] font-normal">
                      {formatRupiah(b.spent)} / {formatRupiah(b.budget_limit)}
                    </span>
                    <span className={cn("text-[10px] font-extrabold ml-1.5", textColor)}>
                      {b.percentage}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-slate-50 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-300", barColor)}
                    style={{ width: `${Math.min(b.percentage, 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Link href="/dashboard/budgets" className="block w-full">
        <Button variant="ghost" className="w-full text-slate-500 hover:text-slate-800 text-xs py-4 rounded-full mt-1">
          Lihat Semua Anggaran
        </Button>
      </Link>
    </div>
  )
}
