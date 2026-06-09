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
  category: 'baru' | 'peningkatan' | 'keamanan'
  text: string
  details?: string
}

const updates: UpdateItem[] = [
  {
    category: 'baru',
    text: 'Panduan Interaktif Fimo',
    details: 'Akses panduan langkah demi langkah tentang alur kerja Fimo dengan menekan tombol tanda tanya di top navbar.',
  },
  {
    category: 'baru',
    text: 'Onboarding Dompet Perdana',
    details: 'Sekarang Anda diarahkan untuk membuat dompet pertama secara langsung saat pertama kali mendaftar, agar aplikasi langsung siap digunakan.',
  },
  {
    category: 'peningkatan',
    text: 'Validasi Dompet Pintar',
    details: 'Sistem otomatis mendeteksi jika Anda belum memiliki dompet dan memberikan saran serta mencegah pencatatan transaksi yang tidak valid.',
  },
  {
    category: 'peningkatan',
    text: 'Notifikasi Mobile Ditingkatkan',
    details: 'Notifikasi toast diatur agar muncul di bagian atas layar mobile agar tidak menutupi bar navigasi utama di bagian bawah.',
  },
  {
    category: 'keamanan',
    text: 'Optimisasi Kebijakan Keamanan RLS & RPC',
    details: 'Peningkatan performa database advisor dan pengamanan ketat pada server functions (execute_wallet_transfer & auth_uid).',
  },
]

export function DeveloperUpdates() {
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
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      case 'peningkatan':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
      case 'keamanan':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
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
      case 'keamanan':
        return 'Keamanan'
      default:
        return category
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
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
      </DialogTrigger>
      <DialogContent className="max-w-[480px] w-[92vw] overflow-y-auto max-h-[85vh] rounded-3xl p-6 md:p-8 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-neutral-200/50 dark:border-neutral-800/50 shadow-2xl">
        <DialogHeader className="pb-2 border-b border-neutral-100 dark:border-neutral-800/80">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">
                Informasi Pembaruan
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Changelog & update terbaru dari developer
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-5">
          {/* Release version & timestamp */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-neutral-50 dark:bg-slate-800/30 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-800/50">
            <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-bold px-2 py-0.5">
                v1.3.0
              </Badge>
              <span>Versi Terbaru</span>
            </div>
            <div className="flex items-center space-x-1 text-[11px] text-neutral-500 dark:text-neutral-400">
              <Calendar className="h-3 w-3" />
              <span>9 Juni 2026, 22:00 WIB</span>
            </div>
          </div>

          {/* List of updates */}
          <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-slate-800">
            {updates.map((item, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-neutral-100 dark:border-neutral-800/60 shadow-xs hover:border-neutral-200 dark:hover:border-neutral-700 transition-all duration-200"
              >
                <div className="mt-0.5 shrink-0">
                  <CheckCircle className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 leading-tight">
                      {item.text}
                    </span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border font-semibold ${getBadgeColor(item.category)}`}>
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
            className="rounded-xl bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-100 text-xs font-bold px-4 py-2 flex items-center"
          >
            Mengerti <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
