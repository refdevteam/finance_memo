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
import { SpendingTrendChart, CategoryPieChart, CategoryMiniPieChart, SpendingMiniTrendChart } from '@/components/dashboard/DashboardCharts'
import { BudgetProgress } from '@/components/dashboard/BudgetProgress'
import { cn } from '@/lib/utils'

interface DashboardWidgetsMobileProps {
  dailyChartData: { date: string; income: number; expense: number }[]
  categoryChartData: { name: string; value: number; color: string }[]
  budgets: BudgetCategory[]
  totalIncome: number
  totalExpense: number
  savingsRate: number
  monthName: string
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
  dailyChartData,
  categoryChartData,
  budgets,
  totalIncome,
  totalExpense,
  savingsRate,
  monthName
}: DashboardWidgetsMobileProps) {
  const [activeDialog, setActiveDialog] = useState<string | null>(null)

  // Budget calculations
  const activeBudgets = budgets.filter((b) => b.budget_limit > 0)
  const totalBudgeted = activeBudgets.reduce((sum, b) => sum + b.budget_limit, 0)
  const totalSpent = activeBudgets.reduce((sum, b) => sum + b.spent, 0)
  const budgetPercentage = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0

  // Category breakdown calculations
  const topCategories = categoryChartData.slice(0, 2)
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
    <div className="grid grid-cols-2 gap-3 md:hidden">
      
      {/* 1. Tren Keuangan (High Priority) */}
      <Dialog open={activeDialog === 'trend'} onOpenChange={(open) => setActiveDialog(open ? 'trend' : null)}>
        <DialogTrigger render={
          <Card className="cursor-pointer active:scale-98 transition-transform select-none bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 shadow-xs hover:border-slate-200 min-h-[140px] flex flex-col justify-between p-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider">
                  Tren Keuangan
                </span>
                <LucideIcons.TrendingUp className="h-4 w-4 text-emerald-500 shrink-0" />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                Rasio Tabungan: {savingsRate}%
              </p>
            </div>
            
            <div className="flex items-center justify-between mt-2 gap-1.5">
              <div className="flex-1 space-y-1 min-w-0">
                <div className="flex items-center text-[10px] text-slate-600 dark:text-slate-400">
                  <LucideIcons.ArrowUpRight className="h-3 w-3 text-emerald-500 mr-1 shrink-0" />
                  <span className="truncate font-mono">{formatRupiah(totalIncome)}</span>
                </div>
                <div className="flex items-center text-[10px] text-slate-600 dark:text-slate-400">
                  <LucideIcons.ArrowDownLeft className="h-3 w-3 text-rose-500 mr-1 shrink-0" />
                  <span className="truncate font-mono">{formatRupiah(totalExpense)}</span>
                </div>
              </div>
              
              {dailyChartData.length > 0 && (
                <SpendingMiniTrendChart data={dailyChartData} />
              )}
            </div>
          </Card>
        } />
        <DialogContent className="max-w-[95%] rounded-3xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold dark:text-white">
              Tren Keuangan — {monthName}
            </DialogTitle>
          </DialogHeader>
          <div className="pt-4 overflow-x-hidden">
            <SpendingTrendChart data={dailyChartData} />
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. Anggaran Kategori (High Priority) */}
      <Dialog open={activeDialog === 'budget'} onOpenChange={(open) => setActiveDialog(open ? 'budget' : null)}>
        <DialogTrigger render={
          <Card className="cursor-pointer active:scale-98 transition-transform select-none bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 shadow-xs hover:border-slate-200 min-h-[140px] flex flex-col justify-between p-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider">
                  Anggaran Kategori
                </span>
                <LucideIcons.PiggyBank className="h-4 w-4 text-amber-500 shrink-0" />
              </div>
              {totalBudgeted > 0 ? (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-semibold truncate">
                  Limit: {formatRupiah(totalBudgeted)}
                </p>
              ) : (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  Belum diatur
                </p>
              )}
            </div>

            <div className="space-y-1.5 mt-2">
              {totalBudgeted > 0 ? (
                <>
                  <div className="flex justify-between items-center text-[9px] font-bold text-slate-600 dark:text-slate-400 font-mono">
                    <span>{formatRupiah(totalSpent)}</span>
                    <span className="font-extrabold">{budgetPercentage}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-300", budgetColorClass)}
                      style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                    />
                  </div>
                </>
              ) : (
                <div className="text-[10px] text-slate-400 italic py-1 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  Set Anggaran
                </div>
              )}
            </div>
          </Card>
        } />
        <DialogContent className="max-w-[95%] rounded-3xl p-5">
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

      {/* 3. Breakdown Kategori (Medium Priority) */}
      <Dialog open={activeDialog === 'breakdown'} onOpenChange={(open) => setActiveDialog(open ? 'breakdown' : null)}>
        <DialogTrigger render={
          <Card className="cursor-pointer active:scale-98 transition-transform select-none bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 shadow-xs hover:border-slate-200 min-h-[140px] flex flex-col justify-between p-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider">
                  Breakdown Kategori
                </span>
                <LucideIcons.PieChart className="h-4 w-4 text-indigo-500 shrink-0" />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-semibold truncate">
                Terbanyak: {topCategoryName}
              </p>
            </div>

            <div className="flex items-center justify-between mt-2 gap-1.5">
              <div className="flex-1 space-y-1 min-w-0">
                {topCategories.length > 0 ? (
                  topCategories.map((c) => (
                    <div key={c.name} className="flex items-center justify-between text-[9px] text-slate-600 dark:text-slate-400">
                      <div className="flex items-center min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full mr-1 shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="truncate">{c.name}</span>
                      </div>
                      <span className="font-mono shrink-0 font-semibold ml-1">{formatRupiah(c.value)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[9px] text-slate-400 italic py-2">
                    Tidak ada transaksi
                  </p>
                )}
              </div>
              
              {categoryChartData.length > 0 && (
                <CategoryMiniPieChart data={categoryChartData} />
              )}
            </div>
          </Card>
        } />
        <DialogContent className="max-w-[95%] rounded-3xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold dark:text-white">
              Pengeluaran per Kategori
            </DialogTitle>
          </DialogHeader>
          <div className="pt-4 flex flex-col items-center justify-center">
            <CategoryPieChart data={categoryChartData} />
            
            {/* Daftar Kategori & Nominal (Amount) */}
            <div className="w-full mt-6 space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {categoryChartData.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all duration-200">
                  <div className="flex items-center min-w-0">
                    <span className="w-3.5 h-3.5 rounded-full mr-2 shrink-0 border border-black/5 dark:border-white/5" style={{ backgroundColor: c.color }} />
                    <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">{c.name}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white ml-2 shrink-0">
                    {formatRupiah(c.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 4. Tips Harian (Low Priority / Edukasi) */}
      <Dialog open={activeDialog === 'tips'} onOpenChange={(open) => setActiveDialog(open ? 'tips' : null)}>
        <DialogTrigger render={
          <Card className="cursor-pointer active:scale-98 transition-transform select-none bg-[#c5b0f4] dark:bg-[#1f1d3d] border-transparent min-h-[140px] flex flex-col justify-between p-3 text-black dark:text-white">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold font-mono text-black/60 dark:text-white/60 uppercase tracking-wider">
                  Tips Harian
                </span>
                <LucideIcons.BookOpen className="h-4 w-4 text-black/60 dark:text-white/60 shrink-0" />
              </div>
              <h4 className="text-xs font-bold mt-1.5">Tips Hemat Hari Ini</h4>
            </div>

            <p className="text-[9px] text-black/80 dark:text-white/80 line-clamp-3 leading-relaxed mt-2">
              &quot;Jangan menabung apa yang tersisa setelah dibelanjakan, tetapi belanjakanlah apa yang tersisa setelah menabung.&quot;
            </p>
          </Card>
        } />
        <DialogContent className="max-w-[95%] rounded-3xl p-5 bg-[#c5b0f4] dark:bg-[#1f1d3d] text-black dark:text-white border-transparent">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-black dark:text-white">
              Tips Hemat Fimo
            </DialogTitle>
          </DialogHeader>
          <div className="pt-4 space-y-3">
            <p className="text-sm italic font-semibold leading-relaxed">
              &quot;Jangan menabung apa yang tersisa setelah dibelanjakan, tetapi belanjakanlah apa yang tersisa setelah menabung.&quot;
            </p>
            <p className="text-xs opacity-80 text-right">— Warren Buffett</p>
            <div className="h-px bg-black/10 dark:bg-white/10 my-2" />
            <p className="text-xs leading-relaxed">
              <strong>Penjelasan:</strong> Salah satu kesalahan keuangan terbesar adalah menabung &quot;apa yang tersisa&quot; di akhir bulan. Biasanya tidak ada yang tersisa. Cobalah metode <em>Pay Yourself First</em>: sisihkan persentase tertentu (misal 10%-20%) langsung saat gajian tiba, kemudian hidup dari sisanya.
            </p>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
