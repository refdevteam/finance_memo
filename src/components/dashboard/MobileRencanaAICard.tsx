'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { AIBudgetPlan } from '@/actions/ai-budget'

interface MobileRencanaAICardProps {
  totalBudgeted: number
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

export function MobileRencanaAICard({ totalBudgeted, aiPlan }: MobileRencanaAICardProps) {
  const [open, setOpen] = useState(false)
  const isBudgetActive = totalBudgeted > 0 || !!aiPlan

  return (
    <div className="md:hidden mb-2.5">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={
          <Card className="cursor-pointer active:scale-98 transition-transform select-none hover:translate-x-0.5 hover:translate-y-0.5 p-3.5 border-2 border-black dark:border-white bg-[#c5b0f4] text-black shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(255,255,255,0.15)] rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center shrink-0 border border-black shadow-sm">
                <Sparkles className="h-4 w-4 text-amber-300 fill-amber-300/20" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black font-mono uppercase tracking-wider text-black/80">
                    Rencana AI
                  </span>
                  <span className="text-[8px] font-extrabold bg-black text-white px-1.5 py-0.2 rounded-full uppercase">
                    {isBudgetActive ? 'Aktif' : 'Draft'}
                  </span>
                </div>
                <p className="text-sm font-black font-mono mt-0.5 text-black truncate">
                  {isBudgetActive ? formatRupiah(totalBudgeted) : 'Belum Diatur'}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <span className="text-[10px] font-extrabold bg-black text-white px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                Detail <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </Card>
        } />

        {/* Pop-up Modal ONLY for Rencana AI details */}
        <DialogContent className="max-w-[92vw] sm:max-w-[420px] rounded-2xl p-5 bg-[#c5b0f4] text-black border-2 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] overflow-hidden">
          <DialogHeader className="border-b border-black/15 pb-3">
            <DialogTitle className="text-base font-black uppercase tracking-wider text-black flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-black fill-black/10" />
              Detail Rencana AI
            </DialogTitle>
          </DialogHeader>

          <div className="pt-3 space-y-3.5">
            <div className="bg-black/5 p-3.5 rounded-xl border border-black/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/60 block">
                  Total Dianggarkan
                </span>
                <span className="text-xl font-black text-black block mt-0.5">
                  {formatRupiah(totalBudgeted)}
                </span>
              </div>
              <span className="text-[9px] font-extrabold bg-black text-white px-2.5 py-1 rounded-full uppercase">
                {isBudgetActive ? 'Rencana Aktif' : 'Draft'}
              </span>
            </div>

            {aiPlan?.analysis?.summary && (
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/60">
                  Ringkasan Analisis AI
                </span>
                <p className="text-xs font-semibold leading-relaxed text-black/90 bg-white/50 p-3 rounded-xl border border-black/10">
                  {aiPlan.analysis.summary}
                </p>
              </div>
            )}

            {aiPlan?.analysis?.priority_action && (
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/60">
                  Prioritas Utama
                </span>
                <p className="text-xs font-extrabold text-black bg-white/50 p-3 rounded-xl border border-black/10">
                  {aiPlan.analysis.priority_action}
                </p>
              </div>
            )}

            <Link href="/dashboard/budgets" className="block w-full pt-1" onClick={() => setOpen(false)}>
              <Button className="w-full text-xs font-bold bg-black text-white hover:bg-neutral-800 rounded-full h-10 flex items-center justify-center gap-1.5 shadow-sm">
                {isBudgetActive ? 'Ubah Rencana Anggaran' : 'Mulai Auto-Plan'} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
