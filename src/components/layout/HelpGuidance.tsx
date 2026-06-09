'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Wallet,
  PieChart,
  PlusCircle,
  PiggyBank,
  ArrowLeftRight,
  TrendingUp,
  Sparkles,
  BookOpen,
  Check
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'

interface Step {
  title: string
  subtitle: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
  visual?: React.ReactNode
}

export function HelpGuidance() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const router = useRouter()

  const handleNext = () => {
    if (step < 7) {
      setStep((s) => s + 1)
    } else {
      setOpen(false)
      setStep(1)
    }
  }

  const handlePrev = () => {
    if (step > 1) {
      setStep((s) => s - 1)
    }
  }

  const handleGoToWallets = () => {
    setOpen(false)
    setStep(1)
    router.push('/dashboard/wallets')
  }

  const steps: Step[] = [
    {
      title: 'Selamat Datang di Fimo!',
      subtitle: 'Alur Arsitektur Keuangan Cerdas',
      description: 'Fimo membantu Anda mencatat, merencanakan, dan menganalisis keuangan pribadi dengan alur kerja yang teratur dan aman. Mari pelajari langkah-langkah dasar agar pengelolaan aset Anda berjalan maksimal!',
      icon: BookOpen,
      iconBg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      visual: (
        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mascot.png" alt="Mascot Welcome" className="w-16 h-16 object-contain drop-shadow-sm animate-bounce" />
          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Asisten Fimo</span>
        </div>
      )
    },
    {
      title: 'Langkah 1: Buat Dompet Anda',
      subtitle: 'Fondasi Saldo Utama (WAJIB)',
      description: 'Sebelum mencatat pengeluaran atau pemasukan, Anda wajib memiliki minimal satu Dompet (misal: Tunai, Rekening BCA, atau E-Wallet). Seluruh saldo transaksi akan bermuara dan memotong dompet yang Anda tentukan di langkah ini.',
      icon: Wallet,
      iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      visual: (
        <div className="flex flex-col items-center p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/30 space-y-3 w-full">
          <div className="flex items-center justify-between w-full bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-emerald-200/40 dark:border-emerald-800/20 shadow-xs">
            <div className="flex items-center space-x-2">
              <span className="text-xl">💳</span>
              <div className="text-left">
                <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Dompet Tunai</p>
                <p className="text-[10px] text-neutral-400">Jenis: Cash</p>
              </div>
            </div>
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">Rp 500.000</span>
          </div>
          <Button
            size="sm"
            onClick={handleGoToWallets}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold shadow-xs py-1.5"
          >
            Buka Menu Dompet Sekarang
          </Button>
        </div>
      )
    },
    {
      title: 'Langkah 2: Tentukan Kategori',
      subtitle: 'Klasifikasi Pengeluaran & Pendapatan',
      description: 'Kelompokkan setiap pengeluaran dan pemasukan dengan kategori yang tepat (seperti Makanan, Gaji, Transportasi, atau Belanja). Fimo menyediakan kategori bawaan, dan Anda bebas menambah kategori kustom sesuai gaya hidup Anda.',
      icon: PieChart,
      iconBg: 'bg-rose-500/10 dark:bg-rose-500/20',
      iconColor: 'text-rose-600 dark:text-rose-400',
      visual: (
        <div className="flex items-center justify-around p-3 bg-rose-50/30 dark:bg-rose-950/10 rounded-2xl border border-rose-100/50 dark:border-rose-900/20 w-full gap-2">
          <div className="flex flex-col items-center p-2 bg-white dark:bg-slate-900 rounded-xl border border-neutral-100 dark:border-neutral-800 shadow-xs w-16">
            <span className="text-lg">🍔</span>
            <span className="text-[9px] font-bold text-neutral-500 mt-1">Makanan</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-white dark:bg-slate-900 rounded-xl border border-neutral-100 dark:border-neutral-800 shadow-xs w-16">
            <span className="text-lg">🚗</span>
            <span className="text-[9px] font-bold text-neutral-500 mt-1">Transport</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-white dark:bg-slate-900 rounded-xl border border-neutral-100 dark:border-neutral-800 shadow-xs w-16">
            <span className="text-lg">💵</span>
            <span className="text-[9px] font-bold text-neutral-500 mt-1">Gaji</span>
          </div>
        </div>
      )
    },
    {
      title: 'Langkah 3: Catat Transaksi',
      subtitle: 'Pencatatan Manual & Scan Struk AI',
      description: 'Tekan tombol (+) di menu utama untuk mencatat pemasukan atau pengeluaran secara cepat. Anda juga dapat menggunakan fitur Scan Struk bertenaga AI untuk memotret nota belanja dan mengisi formulir otomatis!',
      icon: PlusCircle,
      iconBg: 'bg-amber-500/10 dark:bg-amber-500/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
      visual: (
        <div className="flex flex-col items-center p-3 bg-amber-50/30 dark:bg-amber-950/10 rounded-2xl border border-amber-100/50 dark:border-amber-900/20 w-full space-y-2">
          <div className="flex items-center space-x-2 text-[10px] text-amber-700 dark:text-amber-300 font-bold">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            <span>Kamera Scan Struk AI Siap Digunakan</span>
          </div>
          <div className="w-full bg-white dark:bg-slate-900 h-10 rounded-xl border border-neutral-100 dark:border-neutral-800 flex items-center justify-center text-[10px] text-neutral-400">
            [ Foto Nota Belanja Anda di Sini ]
          </div>
        </div>
      )
    },
    {
      title: 'Langkah 4: Atur Anggaran',
      subtitle: 'Batasi Pengeluaran, Cegah Boros',
      description: 'Agar keuangan Anda tetap sehat, tetapkan batas anggaran bulanan untuk kategori spesifik (contoh: batas belanja Rp 1.000.000/bulan). Fimo akan memperingatkan Anda ketika batas pengeluaran tersebut mulai mendekati limit.',
      icon: PiggyBank,
      iconBg: 'bg-sky-500/10 dark:bg-sky-500/20',
      iconColor: 'text-sky-600 dark:text-sky-400',
      visual: (
        <div className="flex flex-col p-3 bg-sky-50/30 dark:bg-sky-950/10 rounded-2xl border border-sky-100/50 dark:border-sky-900/20 w-full space-y-1.5 text-left">
          <div className="flex justify-between text-[10px] font-bold">
            <span className="text-neutral-700 dark:text-neutral-300">Limit Belanja Bulanan</span>
            <span className="text-sky-600 dark:text-sky-400">75% terpakai</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-sky-500 h-full rounded-full w-3/4" />
          </div>
        </div>
      )
    },
    {
      title: 'Langkah 5: Transfer Saldo',
      subtitle: 'Mutasi Dana Antar Dompet',
      description: 'Perlu memindahkan uang dari rekening bank ke e-wallet, atau menarik tunai di ATM? Gunakan fitur Transfer untuk memindahkan dana secara aman, menjaga pencatatan saldo tetap akurat tanpa merusak riwayat transaksi pengeluaran.',
      icon: ArrowLeftRight,
      iconBg: 'bg-blue-500/10 dark:bg-blue-500/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      visual: (
        <div className="flex items-center justify-between p-3 bg-blue-50/30 dark:bg-blue-950/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/20 w-full text-xs font-bold text-neutral-600 dark:text-neutral-450">
          <span>🏦 Bank Mandiri</span>
          <ArrowLeftRight className="h-4 w-4 text-blue-500" />
          <span>📱 Gopay Wallet</span>
        </div>
      )
    },
    {
      title: 'Langkah 6: Analisis Laporan',
      subtitle: 'Visualisasi Grafik & Ringkasan',
      description: 'Langkah terakhir dalam alur Fimo adalah evaluasi. Pantau tren pengeluaran bulanan, pembagian persentase kategori lewat grafik lingkaran, dan unduh ringkasan transaksi Anda untuk merancang strategi menabung yang lebih baik!',
      icon: TrendingUp,
      iconBg: 'bg-purple-500/10 dark:bg-purple-500/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      visual: (
        <div className="flex items-end justify-center p-3 bg-purple-50/30 dark:bg-purple-950/10 rounded-2xl border border-purple-100/50 dark:border-purple-900/20 w-full h-16 gap-3">
          <div className="w-4 bg-purple-500/40 h-8 rounded-t-xs" />
          <div className="w-4 bg-purple-500/60 h-10 rounded-t-xs" />
          <div className="w-4 bg-purple-500/80 h-6 rounded-t-xs" />
          <div className="w-4 bg-purple-50 h-12 rounded-t-xs border border-purple-200" />
        </div>
      )
    }
  ]

  const currentStep = steps[step - 1]
  const IconComponent = currentStep.icon

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) setStep(1); }}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
            aria-label="Panduan Interaktif"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        }
      />
      <DialogContent className="max-w-[480px] w-[92vw] rounded-3xl p-6 md:p-8 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-neutral-200/50 dark:border-neutral-800/50 shadow-2xl overflow-hidden min-h-[440px] flex flex-col justify-between">
        
        <DialogHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
          <DialogTitle className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
            Panduan Fitur ({step} dari 7)
          </DialogTitle>
          <DialogDescription className="sr-only">
            Interactive user guide tour steps to master Fimo application workflows.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper Progress bar */}
        <div className="flex justify-between items-center gap-1.5 my-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i + 1 <= step ? 'bg-indigo-500' : 'bg-neutral-100 dark:bg-neutral-800'
              }`}
            />
          ))}
        </div>

        {/* Interactive content with slider animation */}
        <div className="my-4 flex-1 flex flex-col justify-center min-h-[200px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 text-center flex flex-col items-center"
            >
              {/* Feature Icon */}
              <div className={`p-3.5 rounded-2xl ${currentStep.iconBg} ${currentStep.iconColor} shadow-inner`}>
                <IconComponent className="h-6 w-6 stroke-[2]" />
              </div>

              {/* Text Group */}
              <div className="space-y-1">
                <h3 className="text-base font-extrabold tracking-tight text-neutral-900 dark:text-white">
                  {currentStep.title}
                </h3>
                <p className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400">
                  {currentStep.subtitle}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-[380px] pt-1">
                  {currentStep.description}
                </p>
              </div>

              {/* Visual Preview */}
              {currentStep.visual && (
                <div className="w-full max-w-[280px] pt-1">
                  {currentStep.visual}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Stepper Navigation */}
        <div className="flex justify-between items-center pt-4 border-t border-neutral-100 dark:border-neutral-800/80 gap-3">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={step === 1}
            className="rounded-xl px-3 text-xs font-bold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          >
            <ChevronLeft className="mr-1.5 h-4 w-4" /> Sebelumnya
          </Button>

          {step < 7 ? (
            <Button
              onClick={handleNext}
              className="rounded-xl px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm flex items-center"
            >
              Lanjut <ChevronRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="rounded-xl px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center"
            >
              Selesai <Check className="ml-1.5 h-4 w-4" />
            </Button>
          )}
        </div>

      </DialogContent>
    </Dialog>
  )
}
