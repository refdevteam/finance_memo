'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Activity } from 'lucide-react'
import { getAICoachInsight } from '@/actions/ai-coach'
import { cn } from '@/lib/utils'

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
      <div className="w-full bg-[#c5b0f4] text-black border-2 border-black dark:border-white rounded-xl p-4 sm:p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] flex items-center justify-center py-6 min-h-[96px]">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mascot.png"
              alt="Mascot Loading"
              className="w-12 h-12 object-contain animate-bounce"
            />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-black/15 rounded-full blur-[1px] animate-pulse" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-mono font-extrabold uppercase tracking-wider text-black/60">Fimo AI</h4>
            <p className="text-sm font-bold animate-pulse text-black/80">Fimo lagi bantuin kamu menganalisis catatan keuanganmu...</p>
          </div>
        </div>
      </div>
    )
  }

  const tipText = insight?.tip || "Mulai catat keuanganmu hari ini untuk melihat analisis harian dari Fimo AI!"
  const scoreVal = insight?.score ?? 70

  return (
    <div
      className={cn(
        "w-full bg-[#c5b0f4] text-black border-2 border-black dark:border-white rounded-xl p-4 sm:p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] duration-200"
      )}
    >
      <div className="space-y-1.5 flex-1">
        <div className="flex items-center gap-2 text-xs font-mono font-extrabold uppercase tracking-wider opacity-80">
          <Sparkles className="h-4 w-4 text-black animate-spin-slow fill-black/10 shrink-0" />
          <span>Fimo AI</span>
        </div>
        <p className="text-sm font-semibold leading-relaxed text-black/90 antialiased">
          {tipText}
        </p>
      </div>

      {insight?.score !== undefined && (
        <div className="flex items-center gap-2.5 bg-black text-white px-3 py-1.5 rounded-full shrink-0 border border-black/10 self-start md:self-auto shadow-sm">
          <Activity className="h-3.5 w-3.5 text-indigo-300 fill-indigo-300/10 shrink-0" />
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase opacity-75">Health Score:</span>
          <span className="text-xs font-mono font-extrabold text-[#dceeb1]">{scoreVal === 0 ? '-' : `${scoreVal}/100`}</span>
        </div>
      )}
    </div>
  )
}
