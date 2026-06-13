'use client'

import { useState } from 'react'
import { Flame, Trophy, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface StreakIndicatorProps {
  streak?: number
}

export function StreakIndicator({ streak = 0 }: StreakIndicatorProps) {
  const [open, setOpen] = useState(false)
  const hasStreak = streak > 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button 
            className={cn(
              "flex items-center space-x-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all duration-350 select-none cursor-pointer shrink-0 outline-none",
              hasStreak 
                ? "bg-orange-500/10 dark:bg-orange-500/5 border-orange-500/30 text-orange-600 dark:text-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.15)] hover:bg-orange-500/20" 
                : "bg-neutral-100 border-neutral-200 text-neutral-400 dark:bg-neutral-900/50 dark:border-neutral-800 dark:text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800"
            )}
          >
            <Flame className={cn("h-4 w-4 transition-transform duration-300 hover:scale-110", hasStreak ? "text-orange-500 fill-orange-500/20" : "")} />
            <span>{streak} Hari</span>
          </button>
        }
      />
      
      <DialogContent className="max-w-[440px] w-[92vw] rounded-2xl p-6 bg-white dark:bg-slate-900 border-2 border-black dark:border-white shadow-[8px_8px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_rgba(255,255,255,0.15)] overflow-hidden">
        <DialogHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
              <Flame className="h-5 w-5 fill-orange-500/10 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
                Fimo Streak Pencatatan
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-500 dark:text-neutral-400">
                Bangun kedisiplinan keuangan Anda setiap hari
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-6 flex flex-col items-center text-center space-y-4">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mascot.png"
              alt="Mascot Flame"
              className="w-24 h-24 object-contain drop-shadow-md animate-bounce"
            />
            {hasStreak && (
              <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white font-mono text-[10px] font-bold border-2 border-white animate-pulse">
                🔥
              </span>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-mono text-neutral-450 dark:text-neutral-500 uppercase tracking-widest">Streak Saat Ini</p>
            <h3 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white font-mono">
              {streak} Hari Aktif
            </h3>
          </div>

          <div className="bg-orange-500/5 dark:bg-orange-950/10 border-2 border-orange-500/20 rounded-xl p-4 w-full text-left text-xs leading-relaxed text-neutral-600 dark:text-neutral-300 space-y-2">
            <p className="font-bold text-orange-700 dark:text-orange-400 flex items-center gap-1">
              <Trophy className="h-4 w-4 animate-bounce" /> Cara Menjaga Streak Anda:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-[11px] sm:text-xs">
              <li>Catat pengeluaran, pemasukan, atau transfer secara manual minimal sekali sehari.</li>
              <li>Pindai/scan struk belanja Anda lewat kamera AI Fimo.</li>
              <li>Setiap hari baru, pastikan Anda mencatat transaksi sebelum jam 23.59 malam agar api streak tidak padam!</li>
            </ul>
          </div>
        </div>

        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex justify-end">
          <Button
            onClick={() => setOpen(false)}
            className="rounded-full bg-black hover:bg-neutral-900 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-black text-xs font-bold px-6 py-2 flex items-center transition-all border border-black dark:border-white shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(255,255,255,0.15)]"
          >
            Mengerti <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
