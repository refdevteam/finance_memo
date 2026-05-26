'use client' // Error components must be Client Components

import { useEffect } from 'react'
import { AlertCircle, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Optionally log the error to an error reporting service
    console.error('Dashboard Error boundary caught:', error)
  }, [error])

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/50 rounded-3xl p-8 max-w-md w-full text-center shadow-sm relative overflow-hidden">
        {/* Background blobs for aesthetic */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-rose-100/50 dark:bg-rose-900/20 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-rose-50 dark:bg-rose-900/10 rounded-full blur-xl" />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="h-16 w-16 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center mb-6 text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-8 w-8" />
          </div>
          
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Ups! Gagal Memuat Data
          </h2>
          
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed">
            Terjadi kesalahan teknis saat mengambil data keuangan Anda. Hal ini bisa disebabkan oleh koneksi internet atau masalah server sementara.
          </p>

          <Button 
            onClick={() => reset()}
            className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-xl py-6 shadow-md"
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Coba Muat Ulang
          </Button>
          
          {error.message && (
            <p className="mt-4 text-xs text-slate-400 dark:text-slate-500 break-all bg-slate-50 dark:bg-slate-950 p-2 rounded-lg">
              {error.message}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
