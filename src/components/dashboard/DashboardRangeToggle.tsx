'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function DashboardRangeToggle() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  
  // Get active range. Default to '30days'
  const activeRange = searchParams.get('range') === 'month' ? 'month' : '30days'

  const handleRangeChange = (range: '30days' | 'month') => {
    const params = new URLSearchParams(searchParams.toString())
    if (range === '30days') {
      params.delete('range')
    } else {
      params.set('range', 'month')
    }
    
    const queryString = params.toString()
    router.push(queryString ? `${pathname}?${queryString}` : pathname)
  }

  return (
    <div className="inline-flex items-center bg-slate-100 dark:bg-zinc-900/80 border border-slate-200/60 dark:border-zinc-800/50 p-1 rounded-full shadow-xs">
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
