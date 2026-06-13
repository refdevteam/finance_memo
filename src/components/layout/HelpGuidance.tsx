'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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
  Check,
  Flame,
  Calendar,
  Settings
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
  tag?: string
}

export function HelpGuidance() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0) // Default to 0 (Daftar Fitur / Main Menu)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const completed = localStorage.getItem('fimo_tour_completed')
    if (!completed && pathname === '/dashboard') {
      setOpen(true)
      setStep(1) // Start at Welcome screen
    }
  }, [pathname])

  const handleNext = () => {
    if (step < steps.length) {
      setStep((s) => s + 1)
    } else {
      setOpen(false)
      setStep(0)
      localStorage.setItem('fimo_tour_completed', 'true')
    }
  }

  const handlePrev = () => {
    if (step > 1) {
      setStep((s) => s - 1)
    } else if (step === 1) {
      setStep(0)
    }
  }

  const handleGoToWallets = () => {
    setOpen(false)
    setStep(0)
    router.push('/dashboard/wallets')
  }

  const steps: Step[] = [
    {
      title: 'Selamat Datang di Fimo!',
      subtitle: 'TEMAN PENGELOLA KEUANGANMU',
      description: 'Halo! Senang sekali bisa menemanimu di Fimo. Di sini, kamu bisa mengawasi arus keuangan pribadimu secara rapi dan aman. Yuk, ikuti panduan singkat ini agar kamu bisa langsung lancar mencatat transaksi pertamamu!',
      icon: BookOpen,
      iconBg: 'bg-[#c5b0f4]/20 dark:bg-indigo-500/20',
      iconColor: 'text-[#c5b0f4] dark:text-indigo-400',
      tag: 'Mulai Tur',
      visual: (
        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-zinc-900/40 rounded-xl border border-neutral-100 dark:border-neutral-800/80 space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mascot.png" alt="Mascot Welcome" className="w-16 h-16 object-contain drop-shadow-sm animate-bounce" />
          <span className="text-[10px] font-mono text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">Asisten Fimo</span>
        </div>
      )
    },
    {
      title: '1. Siapkan Dompet Utama',
      subtitle: 'FONDASI UTAMA CATATAN KEUANGAN',
      description: 'Sebelum mencatat pengeluaran, kamu butuh wadah uang virtual yang disebut Dompet. Kamu bisa membuat dompet untuk uang tunai di saku, rekening bank, atau e-wallet. Saldo belanjamu nanti akan terpotong dari dompet pilihanmu ini.',
      icon: Wallet,
      iconBg: 'bg-[#c8e6cd]/40 dark:bg-emerald-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      tag: 'Kelola Dompet',
      visual: (
        <div className="flex flex-col items-center p-4 bg-[#c8e6cd]/10 dark:bg-emerald-950/10 rounded-xl border border-neutral-100 dark:border-neutral-800/80 space-y-3 w-full">
          <div className="flex items-center justify-between w-full bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-neutral-200/50 dark:border-neutral-800/60 shadow-xs">
            <div className="flex items-center space-x-2">
              <span className="text-xl">💳</span>
              <div className="text-left">
                <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Dompet Utama</p>
                <p className="text-[10px] font-mono text-neutral-400 uppercase">Cash</p>
              </div>
            </div>
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">Rp 500.000</span>
          </div>
          <Button
            size="sm"
            onClick={handleGoToWallets}
            className="w-full bg-black hover:bg-neutral-900 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-black rounded-full text-[10px] font-bold shadow-xs py-1.5 transition-all"
          >
            Buka Menu Dompet Sekarang
          </Button>
        </div>
      )
    },
    {
      title: '2. Pilih Kategori yang Pas',
      subtitle: 'KLASIFIKASI PENGELUARAN & PENDAPATAN',
      description: 'Dengan mengelompokkan uang masuk dan keluar ke kategori yang sesuai (seperti Makan, Jajan, atau Gaji), kamu jadi tahu ke mana saja uangmu mengalir. Kamu bebas menggunakan kategori bawaan atau membuat kategorimu sendiri.',
      icon: PieChart,
      iconBg: 'bg-[#efd4d4]/40 dark:bg-rose-500/20',
      iconColor: 'text-rose-600 dark:text-rose-400',
      tag: 'Atur Kategori',
      visual: (
        <div className="flex items-center justify-around p-3 bg-[#efd4d4]/10 dark:bg-rose-950/10 rounded-xl border border-neutral-100 dark:border-neutral-800/80 w-full gap-2">
          <div className="flex flex-col items-center p-2 bg-white dark:bg-zinc-900 rounded-lg border border-neutral-200/50 dark:border-neutral-800/60 shadow-xs w-16">
            <span className="text-lg">🍔</span>
            <span className="text-[9px] font-bold text-neutral-500 mt-1">Makanan</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-white dark:bg-zinc-900 rounded-lg border border-neutral-200/50 dark:border-neutral-800/60 shadow-xs w-16">
            <span className="text-lg">🚗</span>
            <span className="text-[9px] font-bold text-neutral-500 mt-1">Transport</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-white dark:bg-zinc-900 rounded-lg border border-neutral-200/50 dark:border-neutral-800/60 shadow-xs w-16">
            <span className="text-lg">💵</span>
            <span className="text-[9px] font-bold text-neutral-500 mt-1">Gaji</span>
          </div>
        </div>
      )
    },
    {
      title: '3. Catat Transaksi & Scan AI',
      subtitle: 'PENCATATAN MANUAL & SCAN STRUK AI',
      description: 'Cukup ketuk tombol (+) untuk mencatat transaksi baru secara manual. Males mengetik? Tenang, tinggal foto struk belanjamu, dan AI pintar Fimo akan otomatis mengisi nominal, tanggal, serta nama toko untukmu!',
      icon: PlusCircle,
      iconBg: 'bg-[#f4ecd6]/60 dark:bg-amber-500/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
      tag: 'Catat & Scan AI',
      visual: (
        <div className="flex flex-col items-center p-3 bg-[#f4ecd6]/15 dark:bg-amber-950/10 rounded-xl border border-neutral-100 dark:border-neutral-800/80 w-full space-y-2">
          <div className="flex items-center space-x-1.5 text-[10px] text-amber-700 dark:text-amber-300 font-bold">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            <span className="font-mono uppercase tracking-wide">Kamera Scan Struk AI Aktif</span>
          </div>
          <div className="w-full bg-white dark:bg-zinc-900 h-10 rounded-lg border border-neutral-200/50 dark:border-neutral-800/60 flex items-center justify-center text-[10px] text-neutral-400">
            [ Foto Nota Belanja Anda ]
          </div>
        </div>
      )
    },
    {
      title: '4. Mutasi & Transfer Uang',
      subtitle: 'MINDAS SALDO ANTAR DOMPET',
      description: 'Habis isi saldo GoPay dari m-banking atau tarik tunai di ATM? Catat lewat fitur Transfer agar saldo tiap dompetmu selalu sinkron dan akurat, tanpa merusak catatan pengeluaran aslimu.',
      icon: ArrowLeftRight,
      iconBg: 'bg-[#c5b0f4]/20 dark:bg-blue-500/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      tag: 'Transfer Saldo',
      visual: (
        <div className="flex items-center justify-between p-3 bg-[#c5b0f4]/10 dark:bg-zinc-900/30 rounded-xl border border-neutral-100 dark:border-neutral-800/80 w-full text-xs font-bold text-neutral-600 dark:text-neutral-300">
          <span>🏦 Rekening Bank</span>
          <ArrowLeftRight className="h-4 w-4 text-indigo-500 animate-pulse" />
          <span>📱 Dompet Digital</span>
        </div>
      )
    },
    {
      title: '5. Atur Anggaran Bulanan',
      subtitle: 'BATASI PENGELUARAN, CEGAH BOROS',
      description: 'Mau membatasi uang jajan bulanan? Tetapkan batas pengeluaran (misalnya maksimal Rp1.000.000 untuk jajan kopi). Fimo akan mengirimkan pengingat jika pengeluaranmu sudah mendekati batas aman.',
      icon: PiggyBank,
      iconBg: 'bg-[#c8e6cd]/40 dark:bg-sky-500/20',
      iconColor: 'text-sky-600 dark:text-sky-400',
      tag: 'Batas Anggaran',
      visual: (
        <div className="flex flex-col p-3 bg-[#c8e6cd]/10 dark:bg-sky-950/10 rounded-xl border border-neutral-100 dark:border-neutral-800/80 w-full space-y-1.5 text-left">
          <div className="flex justify-between text-[10px] font-bold">
            <span className="text-neutral-700 dark:text-neutral-300">Batas Jajan Kopi</span>
            <span className="text-sky-600 dark:text-sky-400 font-mono">75% terpakai</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div className="bg-sky-500 h-full rounded-full w-3/4" />
          </div>
        </div>
      )
    },
    {
      title: '6. Rencana Transaksi Berulang',
      subtitle: 'OTOMATISASI TAGIHAN & LANGGANAN',
      description: 'Catat transaksi berulang seperti tagihan bulanan, langganan Netflix, atau gaji rutin secara otomatis. Fimo akan membuat transaksinya untukmu secara instan saat tanggal jatuh tempo tiba!',
      icon: Calendar,
      iconBg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      tag: 'Tagihan Rutin',
      visual: (
        <div className="flex items-center justify-between p-3 bg-indigo-500/5 dark:bg-zinc-900/30 rounded-xl border-2 border-black dark:border-neutral-800 w-full text-xs font-mono">
          <div className="flex items-center gap-2">
            <span>📅</span>
            <div className="text-left">
              <p className="font-bold text-neutral-800 dark:text-neutral-200">Netflix Premium</p>
              <p className="text-[10px] text-neutral-400">Bulanan</p>
            </div>
          </div>
          <span className="font-bold text-rose-600">-Rp 186.000</span>
        </div>
      )
    },
    {
      title: '7. Sistem Streak Finansial',
      subtitle: 'TANTANGAN KEDISIPLINAN MENCATAT',
      description: 'Tantang dirimu untuk rajin mencatat keuangan setiap hari! Setiap hari kamu menambahkan transaksi atau scan struk belanja, streak harianmu akan bertambah. Jaga apinya tetap menyala!',
      icon: Flame,
      iconBg: 'bg-orange-500/10 dark:bg-orange-500/20',
      iconColor: 'text-orange-500 dark:text-orange-400',
      tag: 'Streak Harian',
      visual: (
        <div className="flex flex-col items-center p-3 bg-orange-500/5 dark:bg-zinc-900/30 rounded-xl border-2 border-black dark:border-neutral-800 w-full space-y-1">
          <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-bold">
            <Flame className="h-5 w-5 animate-pulse text-orange-500 fill-orange-500/20" />
            <span className="text-sm font-mono tracking-wider">5 Hari Berturut-turut!</span>
          </div>
          <p className="text-[10px] text-neutral-400 text-center font-mono">Hebat! Kamu disiplin menjaga catatanmu.</p>
        </div>
      )
    },
    {
      title: '8. Fimo AI Coach',
      subtitle: 'ANALISIS KEUANGAN & HEALTH SCORE',
      description: 'Dapatkan ulasan analisis keuangan riil dan tips taktis harian, mingguan, hingga bulanan yang dirancang khusus oleh AI Coach pintar Fimo. Periksa juga Financial Health Score kamu untuk mengukur kesehatan keuanganmu secara dinamis!',
      icon: Sparkles,
      iconBg: 'bg-[#c5b0f4]/20 dark:bg-indigo-500/20',
      iconColor: 'text-[#c5b0f4] dark:text-indigo-400',
      tag: 'AI Coach',
      visual: (
        <div className="flex items-center justify-between p-3 bg-[#c5b0f4]/5 dark:bg-zinc-900/30 rounded-xl border-2 border-black dark:border-neutral-800 w-full text-xs">
          <div className="flex items-center gap-1.5 font-bold text-neutral-800 dark:text-neutral-200">
            <Sparkles className="h-4 w-4 text-indigo-500 animate-spin-slow" />
            <span>Fimo AI</span>
          </div>
          <div className="flex items-center gap-1.5 bg-black text-white px-2.5 py-1 rounded-full text-[9px] font-mono font-bold">
            Score: <span className="text-[#dceeb1]">85/100</span>
          </div>
        </div>
      )
    },
    {
      title: '9. Evaluasi Lewat Laporan',
      subtitle: 'POLA KEUANGAN & RIWAYAT BULANAN',
      description: 'Di akhir bulan, kamu bisa melihat ringkasan keuangan dalam bentuk grafik yang cantik dan interaktif. Dari sini, kamu bisa mengevaluasi pengeluaran bulananmu dan merencanakan tabungan masa depan dengan lebih baik!',
      icon: TrendingUp,
      iconBg: 'bg-[#f3c9b6]/30 dark:bg-purple-500/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      tag: 'Grafik Laporan',
      visual: (
        <div className="flex items-end justify-center p-3 bg-[#f3c9b6]/10 dark:bg-purple-950/10 rounded-xl border border-neutral-100 dark:border-neutral-800/80 w-full h-16 gap-3">
          <div className="w-4 bg-purple-500/40 h-8 rounded-t-xs" />
          <div className="w-4 bg-purple-500/60 h-10 rounded-t-xs" />
          <div className="w-4 bg-purple-500/80 h-6 rounded-t-xs" />
          <div className="w-4 bg-black dark:bg-white h-12 rounded-t-xs border border-neutral-200" />
        </div>
      )
    },
    {
      title: '10. Pengaturan & Hak Data',
      subtitle: 'NOTIFIKASI PUSH & GDPR COMPLIANCE',
      description: 'Sesuaikan profil serta mata uang di menu Pengaturan. Aktifkan Notifikasi Push Firebase agar tidak ketinggalan tagihan. Fimo juga mendukung penuh privasi data Anda (GDPR): ekspor seluruh riwayat transaksi dalam format JSON atau hapus akun secara permanen kapan saja.',
      icon: Settings,
      iconBg: 'bg-neutral-500/10 dark:bg-neutral-500/20',
      iconColor: 'text-neutral-600 dark:text-neutral-400',
      tag: 'Ekspor & Privasi',
      visual: (
        <div className="flex flex-col p-3 bg-[#c5b0f4]/5 dark:bg-zinc-900/30 rounded-xl border-2 border-black dark:border-neutral-800 w-full space-y-2 text-left">
          <div className="flex justify-between items-center text-[10px]">
            <span className="font-bold text-neutral-700 dark:text-neutral-300">🔔 Notifikasi Push</span>
            <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-sm font-mono text-[8px]">AKTIF</span>
          </div>
          <div className="flex justify-between items-center text-[10px] border-t border-neutral-100 dark:border-neutral-800/60 pt-2">
            <span className="font-bold text-neutral-700 dark:text-neutral-300">📥 Ekspor Data (GDPR)</span>
            <span className="text-indigo-500 font-mono text-[8px] underline cursor-pointer">Download JSON</span>
          </div>
        </div>
      )
    }
  ]

  const currentStep = steps[step - 1]
  const IconComponent = currentStep?.icon

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) {
        setStep(0);
        localStorage.setItem('fimo_tour_completed', 'true');
      }
    }}>
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
      <DialogContent className="sm:max-w-[480px] w-[92vw] rounded-2xl p-4 sm:p-6 md:p-8 bg-white dark:bg-zinc-900 border-2 border-black dark:border-white shadow-[8px_8px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_rgba(255,255,255,0.15)] overflow-hidden min-h-[460px] max-h-[90vh] flex flex-col justify-between">
        {step === 0 ? (
          <>
            <DialogHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800/80 flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
                  Panduan Fitur Fimo
                </DialogTitle>
                <DialogDescription className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Pilih fitur di bawah untuk langsung mempelajari fungsinya
                </DialogDescription>
              </div>
            </DialogHeader>

            {/* Grid of features */}
            <div className="grid grid-cols-2 gap-2.5 py-4 overflow-y-auto max-h-[50vh] pr-1 scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-zinc-800">
              {steps.map((s, index) => {
                const StepIcon = s.icon
                return (
                  <button
                    key={index}
                    onClick={() => setStep(index + 1)}
                    className="flex flex-col items-center justify-center text-center p-3 rounded-xl border-2 border-black dark:border-neutral-700 bg-neutral-50 dark:bg-zinc-900/40 hover:bg-neutral-100 dark:hover:bg-zinc-800 hover:translate-x-0.5 hover:translate-y-0.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(255,255,255,0.05)] transition-all duration-150 min-h-[110px]"
                  >
                    <div className={`p-2 rounded-xl ${s.iconBg} ${s.iconColor} mb-2 shadow-inner`}>
                      <StepIcon className="h-4 w-4 stroke-[2]" />
                    </div>
                    <span className="text-[10px] font-bold text-neutral-800 dark:text-neutral-200 line-clamp-2 leading-tight px-1">
                      {index === 0 ? 'Selamat Datang' : s.title.replace(/^\d+\.\s*/, '')}
                    </span>
                    <span className="text-[8px] font-mono text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mt-1 block">
                      {s.tag || `Info ${index}`}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800/80 flex justify-end">
              <Button
                onClick={() => setStep(1)}
                className="rounded-full bg-black hover:bg-neutral-900 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-black text-xs font-bold px-6 py-2.5 transition-all shadow-sm"
              >
                Mulai Panduan Berurutan
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800/80 flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-[10px] font-mono font-medium text-neutral-500 dark:text-neutral-500 uppercase tracking-wider">
                  Panduan Fitur ({step} dari {steps.length})
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Interactive user guide tour steps to master Fimo application workflows.
                </DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(0)}
                className="h-7 rounded-full text-[9px] font-bold uppercase tracking-wider border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-zinc-800 px-3 py-1 flex items-center gap-1 -mt-1 shadow-xs"
              >
                <BookOpen className="h-3.5 w-3.5" /> Semua Fitur
              </Button>
            </DialogHeader>

            {/* Stepper Progress bar */}
            <div className="flex justify-between items-center gap-1 my-2">
              {Array.from({ length: steps.length }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    i + 1 <= step ? 'bg-black dark:bg-white' : 'bg-neutral-100 dark:bg-neutral-800'
                  }`}
                />
              ))}
            </div>

            {/* Interactive content with slider animation */}
            <div className="my-4 flex-1 flex flex-col justify-center min-h-[220px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3.5 text-center flex flex-col items-center"
                >
                  {/* Feature Icon */}
                  <div className={`p-3 rounded-2xl ${currentStep?.iconBg || ''} ${currentStep?.iconColor || ''} shadow-inner`}>
                    {IconComponent && <IconComponent className="h-6 w-6 stroke-[2]" />}
                  </div>

                  {/* Text Group */}
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-white">
                      {currentStep?.title}
                    </h3>
                    <p className="text-[9px] font-mono font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                      {currentStep?.subtitle}
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-[380px] pt-1">
                      {currentStep?.description}
                    </p>
                  </div>

                  {/* Visual Preview */}
                  {currentStep?.visual && (
                    <div className="w-full max-w-[280px] pt-1">
                      {currentStep?.visual}
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
                className="rounded-full text-xs font-semibold px-4 py-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-zinc-900/50 transition-all"
              >
                <ChevronLeft className="mr-1.5 h-4 w-4" /> Sebelumnya
              </Button>

              {step < steps.length ? (
                <Button
                  onClick={handleNext}
                  className="rounded-full bg-black hover:bg-neutral-900 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-black text-xs font-bold px-5 py-2 flex items-center transition-all"
                >
                  Lanjut <ChevronRight className="ml-1.5 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  className="rounded-full bg-black hover:bg-neutral-900 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-black text-xs font-bold px-5 py-2 flex items-center transition-all"
                >
                  Selesai <Check className="ml-1.5 h-4 w-4" />
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
