'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

export function DashboardRangeToggle() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get active range. Default to '30days'
  const activeRange = searchParams.get('range') === 'month' ? 'month' : '30days'

  const handleRangeChange = (range: '30days' | 'month') => {
    if (range === '30days') {
      router.push('/dashboard') // Default doesn't need param
    } else {
      router.push('/dashboard?range=month')
    }
  }

  return (
    <div className="inline-flex items-center bg-slate-100 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/50 p-1 rounded-full shadow-xs">
      <button
        onClick={() => handleRangeChange('30days')}
        className={cn(
          "px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 transform active:scale-95 focus:outline-none shrink-0",
          activeRange === '30days'
            ? "bg-black text-white dark:bg-white dark:text-black shadow-sm"
            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        )}
      >
        30 Hari Terakhir
      </button>

      <button
        onClick={() => handleRangeChange('month')}
        className={cn(
          "px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 transform active:scale-95 focus:outline-none shrink-0",
          activeRange === 'month'
            ? "bg-black text-white dark:bg-white dark:text-black shadow-sm"
            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        )}
      >
        Bulan Ini
      </button>
    </div>
  )
}
