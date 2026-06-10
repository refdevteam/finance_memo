'use client'

import { useState } from 'react'
import { Sparkles, Calendar, CheckCircle, ArrowRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface UpdateItem {
  category: 'baru' | 'peningkatan'
  text: string
  details?: string
}

const updates: UpdateItem[] = [
  {
    category: 'baru',
    text: 'Panduan Interaktif Fimo',
    details: 'Pelajari alur kerja keuangan cerdas Fimo lewat panduan visual langkah-demi-langkah baru.',
  },
  {
    category: 'baru',
    text: 'Pembuatan Dompet Saat Daftar',
    details: 'Kamu sekarang bisa langsung membuat dompet pertamamu saat pertama kali mendaftar agar dasbor langsung siap dipakai.',
  },
  {
    category: 'peningkatan',
    text: 'Pencegahan Transaksi Kosong',
    details: 'Fimo sekarang otomatis mendeteksi jika kamu belum punya dompet dan membantumu membuatnya sebelum mencatat pengeluaran.',
  },
  {
    category: 'peningkatan',
    text: 'Tata Letak Notifikasi Ponsel',
    details: 'Notifikasi toast di ponsel kini dipindahkan ke bagian atas layar agar tidak menutupi menu navigasi bawah.',
  },
]

export function DeveloperUpdates({ asSidebarItem = false }: { asSidebarItem?: boolean }) {
  const [open, setOpen] = useState(false)
  const [hasNewUpdate, setHasNewUpdate] = useState(true) // Show indicator by default

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      setHasNewUpdate(false) // Clear indicator once viewed
    }
  }

  const getBadgeColor = (category: string) => {
    switch (category) {
      case 'baru':
        return 'bg-[#c8e6cd]/60 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-500/20'
      case 'peningkatan':
        return 'bg-[#c5b0f4]/30 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-500/20'
      default:
        return 'bg-neutral-500/10 text-neutral-600 border-neutral-500/20'
    }
  }

  const getBadgeLabel = (category: string) => {
    switch (category) {
      case 'baru':
        return 'Baru'
      case 'peningkatan':
        return 'Peningkatan'
      default:
        return category
    }
  }

  const triggerButton = asSidebarItem ? (
    <Button
      variant="ghost"
      className="w-full flex items-center justify-start space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-900 transition-all relative"
    >
      <Sparkles className="h-5 w-5 text-amber-500 shrink-0" />
      <span className="flex-1 text-left">Info Pembaruan</span>
      {hasNewUpdate && (
        <span className="absolute top-3 right-3 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
      )}
    </Button>
  ) : (
    <Button
      variant="ghost"
      size="icon"
      className="w-8 h-8 rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 relative"
      aria-label="Developer Updates"
    >
      <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-400" />
      {hasNewUpdate && (
        <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
      )}
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={triggerButton} />
      <DialogContent className="max-w-[480px] w-[92vw] overflow-y-auto max-h-[85vh] rounded-[24px] p-6 md:p-8 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-neutral-200/50 dark:border-neutral-800/50 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Informasi Pembaruan
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Rangkuman fitur baru & peningkatan sistem Fimo
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-5">
          {/* Release version & timestamp */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-neutral-50 dark:bg-slate-800/30 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800/50">
            <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              <Badge variant="outline" className="bg-[#f3c9b6]/30 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-500/20 font-bold px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase">
                v1.3.0
              </Badge>
              <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Versi Terbaru</span>
            </div>
            <div className="flex items-center space-x-1 text-[10px] font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
              <Calendar className="h-3.5 w-3.5 mr-0.5" />
              <span>9 Juni 2026</span>
            </div>
          </div>

          {/* List of updates */}
          <div className="space-y-3.5 max-h-[40vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-slate-800">
            {updates.map((item, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-neutral-100 dark:border-neutral-800/60 shadow-xs hover:border-neutral-200 dark:hover:border-neutral-700 transition-all duration-200"
              >
                <div className="mt-0.5 shrink-0">
                  <CheckCircle className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 leading-tight">
                      {item.text}
                    </span>
                    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border font-semibold rounded-md ${getBadgeColor(item.category)}`}>
                      {getBadgeLabel(item.category)}
                    </Badge>
                  </div>
                  {item.details && (
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                      {item.details}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800/80 flex justify-end">
          <Button
            onClick={() => setOpen(false)}
            className="rounded-full bg-black hover:bg-neutral-900 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-black text-xs font-bold px-5 py-2.5 flex items-center transition-all"
          >
            Mengerti <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
