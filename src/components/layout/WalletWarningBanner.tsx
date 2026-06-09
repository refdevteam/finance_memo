'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AlertTriangle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WalletWarningBannerProps {
  walletsCount: number
}

export function WalletWarningBanner({ walletsCount }: WalletWarningBannerProps) {
  const pathname = usePathname()

  // Hide the banner if the user is on the onboarding page or already has wallets
  if (pathname === '/dashboard/onboarding' || walletsCount > 0) {
    return null
  }

  return (
    <div className="w-full bg-amber-500/10 dark:bg-amber-500/5 border-b border-amber-500/20 px-4 py-3.5 backdrop-blur-md transition-all duration-300">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
            <AlertTriangle className="h-5 w-5 animate-pulse" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs sm:text-sm font-bold text-amber-800 dark:text-amber-300">
              Kamu Belum Memiliki Dompet
            </p>
            <p className="text-[11px] sm:text-xs text-amber-600 dark:text-amber-450 leading-relaxed max-w-2xl">
              Fimo mewajibkan pembuatan dompet terlebih dahulu sebelum Anda dapat mencatat pemasukan, pengeluaran, maupun transfer saldo.
            </p>
          </div>
        </div>
        <Link href="/dashboard/wallets" className="w-full sm:w-auto shrink-0">
          <Button
            size="sm"
            className="w-full bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-sm shadow-amber-500/20 py-1.5 flex items-center justify-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Buat Dompet
          </Button>
        </Link>
      </div>
    </div>
  )
}
