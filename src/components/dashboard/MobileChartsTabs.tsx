'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { SpendingTrendChart, CategoryBarChart } from './DashboardCharts'
import { cn } from '@/lib/utils'

interface MobileChartsTabsProps {
  dailyChartData: { date: string; income: number; expense: number }[]
  categoryChartData: { name: string; value: number; color: string }[]
  savingsRate: number
  chartTitleLabel: string
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function MobileChartsTabs({
  dailyChartData,
  categoryChartData,
  savingsRate,
  chartTitleLabel,
}: MobileChartsTabsProps) {
  const [activeTab, setActiveTab] = useState<'trend' | 'category'>('category')

  return (
    <Card className="block md:hidden border-2 border-black dark:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden">
      <CardHeader className="p-4 pb-2 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center justify-between gap-2">
          {/* User Tab Selector Chips */}
          <div className="flex gap-1 bg-slate-100 dark:bg-zinc-950 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('category')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 transform active:scale-95 border-none",
                activeTab === 'category'
                  ? "bg-black text-white dark:bg-white dark:text-black shadow-sm"
                  : "text-slate-500 dark:text-slate-400"
              )}
            >
              📊 Kategori
            </button>
            <button
              onClick={() => setActiveTab('trend')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 transform active:scale-95 border-none",
                activeTab === 'trend'
                  ? "bg-black text-white dark:bg-white dark:text-black shadow-sm"
                  : "text-slate-500 dark:text-slate-400"
              )}
            >
              📈 Tren
            </button>
          </div>
          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
            {chartTitleLabel}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-4">
        {activeTab === 'trend' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">
              <span>Aliran Kas Harian</span>
              <span className="font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px]">
                Rasio Tabungan: {savingsRate}%
              </span>
            </div>
            <div className="h-[200px] overflow-hidden pr-2">
              <SpendingTrendChart data={dailyChartData} height={200} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">
              <span>Pengeluaran per Kategori</span>
              <span className="font-mono text-slate-400 text-[10px]">
                {categoryChartData.length} Kategori
              </span>
            </div>
            
            {categoryChartData.length > 0 ? (
              <>
                <div className="flex flex-col items-center justify-center min-h-[160px] relative pr-2">
                  <CategoryBarChart data={categoryChartData} height={160} />
                </div>
                
                {/* Legenda Detail mirip popup pengeluaran per kategori */}
                <div className="w-full mt-4 space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {categoryChartData.map((c) => (
                    <div 
                      key={c.name} 
                      className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-100 dark:border-zinc-800/60 hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition-all duration-200"
                    >
                      <div className="flex items-center min-w-0">
                        <span 
                          className="w-3.5 h-3.5 rounded-full mr-2 shrink-0 border border-black/5 dark:border-white/5" 
                          style={{ backgroundColor: c.color }} 
                        />
                        <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                          {c.name}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-slate-900 dark:text-white ml-2 shrink-0">
                        {formatRupiah(c.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center min-h-[160px] border-2 border-dashed border-border rounded-xl">
                <p className="text-muted-foreground text-xs">Belum ada pengeluaran bulan ini.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
