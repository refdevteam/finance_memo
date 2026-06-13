'use client'

import { Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StreakIndicatorProps {
  streak?: number
}

export function StreakIndicator({ streak = 0 }: StreakIndicatorProps) {
  const hasStreak = streak > 0

  return (
    <div 
      title={hasStreak ? `Streak Anda: ${streak} hari aktif mencatat!` : "Catat transaksi Anda hari ini untuk memulai streak!"}
      className={cn(
        "flex items-center space-x-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all duration-350 select-none cursor-help shrink-0",
        hasStreak 
          ? "bg-orange-500/10 dark:bg-orange-500/5 border-orange-500/30 text-orange-600 dark:text-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.15)] hover:bg-orange-500/20" 
          : "bg-neutral-100 border-neutral-200 text-neutral-400 dark:bg-neutral-900/50 dark:border-neutral-800 dark:text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800"
      )}
    >
      <Flame className={cn("h-4 w-4 transition-transform duration-300 hover:scale-110", hasStreak ? "text-orange-500 fill-orange-500/20" : "")} />
      <span>{streak} Hari</span>
    </div>
  )
}
