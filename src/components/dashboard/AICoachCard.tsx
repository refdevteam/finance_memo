'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Activity } from 'lucide-react'
import { getAICoachInsight } from '@/actions/ai-coach'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

export function AICoachCard() {
  const [insight, setInsight] = useState<{ tip: string; score?: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadInsight() {
      try {
        const res = await getAICoachInsight('daily')
        if (res.success && res.data) {
          setInsight(res.data)
        }
      } catch (err) {
        console.error('Failed to load AI Coach insights:', err)
      } finally {
        setLoading(false)
      }
    }
    loadInsight()
  }, [])

  if (loading) {
    return (
      <div className="w-full bg-[#c5b0f4]/10 dark:bg-[#c5b0f4]/5 border-2 border-[#c5b0f4]/30 rounded-xl p-4 sm:p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full bg-[#c5b0f4]/30" />
          <Skeleton className="h-4 w-32 bg-[#c5b0f4]/20" />
        </div>
        <Skeleton className="h-4 w-full bg-[#c5b0f4]/20" />
        <Skeleton className="h-4 w-[75%] bg-[#c5b0f4]/20" />
      </div>
    )
  }

  const tipText = insight?.tip || "Mulai catat keuanganmu hari ini untuk melihat analisis harian dari Fimo AI Coach!"
  const scoreVal = insight?.score ?? 70

  return (
    <div 
      className={cn(
        "w-full bg-[#c5b0f4] text-black border-2 border-black rounded-xl p-4 sm:p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] duration-200"
      )}
    >
      <div className="space-y-1.5 flex-1">
        <div className="flex items-center gap-2 text-xs font-mono font-extrabold uppercase tracking-wider opacity-80">
          <Sparkles className="h-4 w-4 text-black animate-spin-slow fill-black/10 shrink-0" />
          <span>Fimo AI Coach</span>
        </div>
        <p className="text-sm font-semibold leading-relaxed text-black/90 antialiased">
          {tipText}
        </p>
      </div>
      
      {insight?.score !== undefined && (
        <div className="flex items-center gap-2.5 bg-black text-white px-3 py-1.5 rounded-full shrink-0 border border-black/10 self-start md:self-auto shadow-sm">
          <Activity className="h-3.5 w-3.5 text-indigo-300 fill-indigo-300/10 shrink-0" />
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase opacity-75">Health Score:</span>
          <span className="text-xs font-mono font-extrabold text-[#dceeb1]">{scoreVal}/100</span>
        </div>
      )}
    </div>
  )
}
