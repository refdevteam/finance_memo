'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Activity, ArrowRight } from 'lucide-react'
import { getAICoachInsight } from '@/actions/ai-coach'
import { cn } from '@/lib/utils'
import { AIBudgetPlan } from '@/actions/ai-budget'
import Link from 'next/link'

type AnalysisType = 'plan' | 'daily' | 'weekly' | '30days' | 'month'

interface AICoachCardProps {
  aiPlan?: AIBudgetPlan | null
}

export function AICoachCard({ aiPlan }: AICoachCardProps = {}) {
  const [selectedType, setSelectedType] = useState<AnalysisType>('plan')
  const [insight, setInsight] = useState<{ tip: string; score?: number } | null>(null)
  const [loading, setLoading] = useState(false)

  const options = [
    { value: 'plan', label: 'Rencana AI' },
    { value: 'daily', label: 'Harian' },
    { value: 'weekly', label: 'Mingguan' },
    { value: '30days', label: '30 Hari' },
    { value: 'month', label: 'Bulan Ini' },
  ] as const

  useEffect(() => {
    let active = true
    if (selectedType === 'plan') {
      setInsight(null)
      setLoading(false)
      return
    }

    async function loadInsight() {
      setLoading(true)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = await getAICoachInsight(selectedType as any)
        if (active) {
          if (res.success && res.data) {
            setInsight(res.data)
          } else {
            setInsight(null)
          }
        }
      } catch (err) {
        console.error('Failed to load AI Coach insights:', err)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }
    loadInsight()
    return () => {
      active = false
    }
  }, [selectedType])

  // Determine what to show
  let content = null
  const scoreVal = insight?.score ?? 70
  let hasScore = insight?.score !== undefined

  if (selectedType === 'plan') {
    hasScore = false
    if (aiPlan) {
      content = (
        <div className="space-y-3">
          <p className="text-sm font-semibold leading-relaxed text-black/90">
            {aiPlan.analysis?.summary || 'Rencana alokasi keuangan cerdas bulan ini sudah aktif.'}
          </p>
          <div className="flex items-center justify-between bg-black/5 p-2 rounded-xl border border-black/10">
            <span className="text-xs font-bold text-black/80">Prioritas: {aiPlan.analysis?.priority_action || 'Pantau pengeluaran'}</span>
            <Link href="/dashboard/budgets" className="text-[10px] font-bold bg-black text-white px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-neutral-800 transition-colors">
              Lihat Detail <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )
    } else {
      content = (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-sm font-semibold leading-relaxed text-black/90">
            Halo! Aku belum merencanakan anggaran bulan ini. Mau aku bantu atur agar pengeluaranmu lebih efisien?
          </p>
          <Link href="/dashboard/budgets" className="text-xs font-bold bg-black text-white px-4 py-2 rounded-full flex items-center gap-1.5 hover:bg-neutral-800 transition-colors shadow-[2px_2px_0px_rgba(255,255,255,0.3)] shrink-0">
            <Sparkles className="h-4 w-4 text-amber-300" />
            Mulai Auto-Plan
          </Link>
        </div>
      )
    }
  } else {
    const tipText = insight?.tip || "Mulai catat keuanganmu untuk melihat analisis dari Fimo AI!"
    content = (
      <>
        <div className="space-y-1.5 flex-1">
          <p className="text-sm font-semibold leading-relaxed text-black/90 antialiased">
            {tipText}
          </p>
        </div>
        {hasScore && (
          <div className="flex items-center gap-2.5 bg-black text-white px-3 py-1.5 rounded-full shrink-0 border border-black/10 self-start md:self-auto shadow-sm">
            <Activity className="h-3.5 w-3.5 text-indigo-300 fill-indigo-300/10 shrink-0" />
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase opacity-75">Health Score:</span>
            <span className="text-xs font-mono font-extrabold text-[#dceeb1]">
              {scoreVal === 0 ? '-' : `${scoreVal}/100`}
            </span>
          </div>
        )}
      </>
    )
  }

  return (
    <div
      className={cn(
        "w-full bg-[#c5b0f4] text-black border-2 border-black dark:border-white rounded-2xl p-4 sm:p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] flex flex-col gap-4 transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] duration-200"
      )}
    >
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/10 pb-3 w-full min-w-0">
        <div className="flex items-center gap-2 text-xs font-mono font-extrabold uppercase tracking-wider opacity-80 shrink-0">
          <Sparkles className="h-4 w-4 text-black animate-spin-slow fill-black/10 shrink-0" />
          <span>Fimo Coach</span>
        </div>

        {/* Selection Switcher */}
        <div className="flex w-full sm:w-auto gap-1 bg-black/5 p-1 rounded-2xl border border-black/10 overflow-x-auto overflow-y-hidden no-scrollbar min-w-0">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelectedType(opt.value)}
              className={cn(
                "px-2 py-1.5 sm:px-3 sm:py-1 rounded-lg text-[9px] xs:text-[10px] font-bold uppercase tracking-wider transition-all duration-150 border text-center whitespace-nowrap",
                selectedType === opt.value
                  ? "bg-black text-white border-black shadow-[2px_2px_0px_rgba(255,255,255,0.15)]"
                  : "text-black/70 hover:text-black hover:bg-black/5 border-transparent"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 min-h-[52px]">
        {loading ? (
          <div className="flex items-center gap-3 py-1 flex-1">
            <div className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/mascot.png"
                alt="Mascot Loading"
                className="w-10 h-10 object-contain animate-bounce"
              />
              <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-1 bg-black/15 rounded-full blur-[1px]" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold animate-pulse text-black/60">
                Fimo sedang menganalisis catatan keuangan {selectedType === 'daily' ? 'harian' : selectedType === 'weekly' ? 'mingguan' : selectedType === '30days' ? '30 hari terakhir' : 'bulan ini'} kamu...
              </p>
            </div>
          </div>
        ) : (
          content
        )}
      </div>
    </div>
  )
}
