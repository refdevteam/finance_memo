'use client'

import { useState, useRef, useEffect } from 'react'
import { Download, TrendingUp, TrendingDown, Wallet, Sparkles, AlertTriangle, CheckCircle2, Loader2, Info } from 'lucide-react'
import { motion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { InlineSelect } from '@/components/ui/inline-select'
import { toast } from 'sonner'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { CategoryPieChart, SixMonthTrendChart } from '@/components/dashboard/DashboardCharts'
import { DashboardRangeToggle } from '@/components/dashboard/DashboardRangeToggle'
import { cn } from '@/lib/utils'
import { generateMonthlyInsights } from '@/actions/ai-insights'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ]
  const monthIndex = parseInt(m) - 1
  return `${parseInt(d)} ${monthNames[monthIndex]} ${y}`
}

const MONTHS = [
  { value: '1', label: 'Januari' }, { value: '2', label: 'Februari' },
  { value: '3', label: 'Maret' }, { value: '4', label: 'April' },
  { value: '5', label: 'Mei' }, { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' }, { value: '8', label: 'Agustus' },
  { value: '9', label: 'September' }, { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' }, { value: '12', label: 'Desember' },
]

export function ReportsClient({
  wallets,
  monthTransactions,
  sixMonthTransactions,
  eventTransactions = [],
  selectedMonth,
  selectedYear,
  selectedWallet,
  range,
  startDateStr,
  endDateStr
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wallets: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  monthTransactions: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sixMonthTransactions: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eventTransactions?: any[]
  selectedMonth: number
  selectedYear: number
  selectedWallet: string | null
  range: string
  startDateStr: string
  endDateStr: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reportRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // AI Insights State
  const [insight, setInsight] = useState<{
    summary: string
    financial_score: number
    tips: string[]
    warnings: string[]
  } | null>(null)
  const [isLoadingInsight, setIsLoadingInsight] = useState(false)
  const [showGajianTip, setShowGajianTip] = useState(false)

  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Reset insights when period changes
  useEffect(() => {
    setInsight(null)
  }, [selectedMonth, selectedYear, selectedWallet, range])

  // GSAP Entrance Stagger Animation
  useEffect(() => {
    import('gsap').then(({ gsap }) => {
      gsap.fromTo(".report-card-animate",
        { opacity: 0, y: 15 },
        { 
          opacity: 1, 
          y: 0, 
          duration: 0.6, 
          stagger: 0.08, 
          ease: "power2.out",
          clearProps: "y,transform"
        }
      )
    })
  }, [selectedMonth, selectedYear, selectedWallet, range])

  // -- CALCULATIONS FOR SUMMARY CARDS --
  const totalIncome = monthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const totalExpense = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const netSavings = totalIncome - totalExpense

  // -- DATA PREP FOR CATEGORY PIE CHART --
  const categoryMap = new Map<string, { name: string; value: number; color: string }>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  monthTransactions.filter(t => t.type === 'expense').forEach((t: any) => {
    const catName = t.categories?.name || 'Lainnya'
    const catColor = t.categories?.color || '#94a3b8'
    const existing = categoryMap.get(catName) || { name: catName, value: 0, color: catColor }
    existing.value += Number(t.amount)
    categoryMap.set(catName, existing)
  })
  const categoryChartData = Array.from(categoryMap.values()).sort((a, b) => b.value - a.value)

  // -- DATA PREP FOR 6 MONTH TREND BAR CHART --
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"]
  const trendMap = new Map<string, { income: number, expense: number }>()

  for (let i = 5; i >= 0; i--) {
    let targetMonth = selectedMonth - i
    let targetYear = selectedYear
    while (targetMonth <= 0) {
      targetMonth += 12
      targetYear -= 1
    }
    const key = `${targetYear}-${String(targetMonth).padStart(2, '0')}`
    trendMap.set(key, { income: 0, expense: 0 })
  }

  sixMonthTransactions.forEach(t => {
    const [y, m] = t.transaction_date.split('-')
    const key = `${y}-${m}`
    if (trendMap.has(key)) {
      const data = trendMap.get(key)!
      if (t.type === 'income') data.income += Number(t.amount)
      if (t.type === 'expense') data.expense += Number(t.amount)
    }
  })

  const trendChartData = Array.from(trendMap.entries()).map(([key, data]) => {
    const [y, m] = key.split('-')
    const monthStr = monthNames[parseInt(m) - 1]
    return {
      date: `${monthStr} ${y}`,
      income: data.income,
      expense: data.expense
    }
  })

  // -- ACTIONS --
  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`/dashboard/reports?${params.toString()}`)
  }

  const exportPDF = async () => {
    if (!reportRef.current) return
    setIsExporting(true)

    const element = reportRef.current

    // Create and append temporary stylesheet to force beautiful desktop grid layout during PDF generation
    const style = document.createElement('style')
    style.id = 'pdf-export-style'
    style.innerHTML = `
      .print-pdf-container {
        width: 1024px !important;
        max-width: 1024px !important;
        padding: 32px !important;
        background-color: #ffffff !important;
        color: #000000 !important;
        border-radius: 24px !important;
      }
      .print-pdf-container .summary-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      }
      .print-pdf-container .summary-grid > div {
        grid-column: span 1 / span 1 !important;
      }
      .print-pdf-container .charts-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
      .print-pdf-container .ai-upper-block {
        flex-direction: row !important;
        align-items: flex-start !important;
      }
      .print-pdf-container .ai-score-circle {
        margin-left: 0 !important;
        margin-right: 0 !important;
      }
      .print-pdf-container .ai-details-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
      .print-pdf-container .category-details-list {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
      /* Clean white theme for dark mode users during PDF printing */
      .dark .print-pdf-container {
        background-color: #ffffff !important;
        color: #000000 !important;
      }
      .dark .print-pdf-container h2, 
      .dark .print-pdf-container h3, 
      .dark .print-pdf-container h4, 
      .dark .print-pdf-container p,
      .dark .print-pdf-container span,
      .dark .print-pdf-container div {
        color: #0d1117 !important;
      }
      .dark .print-pdf-container .bg-emerald-50, 
      .dark .print-pdf-container .bg-rose-50, 
      .dark .print-pdf-container .bg-blue-50 {
        background-color: #f0fdf4 !important;
      }
      .dark .print-pdf-container .bg-rose-50 {
        background-color: #fff1f2 !important;
      }
      .dark .print-pdf-container .bg-blue-50 {
        background-color: #eff6ff !important;
      }
      .dark .print-pdf-container .bg-white\\/40 {
        background-color: #f8fafc !important;
      }
      .dark .print-pdf-container .border-indigo-100 {
        border-color: #e0e7ff !important;
      }
      .dark .print-pdf-container .from-indigo-50\\/40 {
        background-image: linear-gradient(to bottom right, #f5f3ff, #ffffff, #faf5ff) !important;
      }
    `
    document.body.appendChild(style)
    element.classList.add('print-pdf-container')

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1024 // Simulates 1024px width viewport for responsive elements
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      const isMonth = range === 'month'
      const pdfFileName = isMonth
        ? `Laporan_Keuangan_Fimo_${MONTHS.find(m => m.value === String(selectedMonth))?.label}_${selectedYear}.pdf`
        : `Laporan_Keuangan_Fimo_30_Hari_Terakhir.pdf`
      pdf.save(pdfFileName)

      toast.success('Laporan berhasil diunduh')
    } catch (error) {
      console.error(error)
      toast.error('Gagal membuat PDF')
    } finally {
      // Remove classes and styles
      element.classList.remove('print-pdf-container')
      const styleTag = document.getElementById('pdf-export-style')
      if (styleTag) styleTag.remove()
      setIsExporting(false)
    }
  }

  const exportExcel = () => {
    try {
      // 1. Define CSV headers
      const headers = ['Tanggal', 'Tipe', 'Kategori', 'Dompet', 'Nominal', 'Catatan']
      
      // 2. Format row values
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = monthTransactions.map((t: any) => {
        const typeLabel = t.type === 'income' ? 'Pemasukan' : t.type === 'expense' ? 'Pengeluaran' : 'Transfer'
        const categoryLabel = t.categories?.name || 'Lainnya'
        const walletLabel = wallets.find(w => w.id === t.wallet_id)?.name || 'Semua Dompet'
        const amountVal = t.amount || 0
        const notes = t.description ? t.description.replace(/"/g, '""') : ''
        
        return [
          t.transaction_date,
          typeLabel,
          categoryLabel,
          walletLabel,
          amountVal,
          `"${notes}"`
        ]
      })
      
      // 3. Assemble CSV string with BOM to support Excel UTF-8
      const csvContent = '\ufeff' + 
        [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
      
      // 4. Trigger download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const isMonth = range === 'month'
      const fileName = isMonth
        ? `Laporan_Keuangan_Fimo_${MONTHS.find(m => m.value === String(selectedMonth))?.label}_${selectedYear}.csv`
        : `Laporan_Keuangan_Fimo_30_Hari_Terakhir.csv`
        
      link.setAttribute('href', url)
      link.setAttribute('download', fileName)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('Data transaksi berhasil diekspor ke Excel (CSV)')
    } catch (error) {
      console.error(error)
      toast.error('Gagal mengekspor data ke Excel')
    }
  }

  const handleGenerateInsight = async () => {
    setIsLoadingInsight(true)
    try {
      const res = await generateMonthlyInsights(range === 'month' ? 'month' : '30days', selectedMonth, selectedYear)
      if (res.success && res.data) {
        setInsight(res.data)
        toast.success('Analisis AI berhasil dibuat!')
      } else {
        toast.error(res.error || 'Gagal membuat analisis AI.')
      }
    } catch (error) {
      console.error(error)
      toast.error('Terjadi kesalahan saat menghubungi Fimo AI.')
    } finally {
      setIsLoadingInsight(false)
    }
  }

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = new Date().getFullYear() - 2 + i
    return { value: String(y), label: String(y) }
  })

  const nonEventWallets = wallets.filter(w => !w.is_event_wallet)
  const eventWallets = wallets.filter(w => w.is_event_wallet)

  const walletOptions = [
    { value: 'all', label: 'Semua Dompet' },
    ...nonEventWallets.map(w => ({ value: w.id, label: w.name }))
  ]

  const isMonth = range === 'month'

  // Determine score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/50'
    if (score >= 50) return 'text-amber-500 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50'
    return 'text-rose-500 border-rose-200 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900/50'
  }

  return (
    <div className="space-y-8">
      {/* HEADER & FILTERS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight dark:text-white">Laporan Keuangan</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Analisis pengeluaran dan pemasukan bulanan.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="flex justify-start sm:justify-end">
            <DashboardRangeToggle />
          </div>

          <div className={cn(
            "grid gap-2 w-full sm:w-auto sm:flex sm:flex-wrap sm:items-center",
            isMonth ? "grid-cols-2" : "grid-cols-1"
          )}>
            {isMonth && (
              <>
                <div className="col-span-1 sm:w-32">
                  <InlineSelect
                    options={MONTHS}
                    value={String(selectedMonth)}
                    onChange={(v) => updateFilters('month', v)}
                  />
                </div>
                <div className="col-span-1 sm:w-24">
                  <InlineSelect
                    options={yearOptions}
                    value={String(selectedYear)}
                    onChange={(v) => updateFilters('year', v)}
                  />
                </div>
              </>
            )}

            <div className={cn(
              "sm:w-40",
              isMonth ? "col-span-2" : "col-span-1"
            )}>
              <InlineSelect
                options={walletOptions}
                value={selectedWallet || 'all'}
                onChange={(v) => updateFilters('wallet', v)}
              />
            </div>

            <Button
              onClick={exportExcel}
              className={cn(
                "sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white w-full rounded-full text-xs font-semibold",
                isMonth ? "col-span-2" : "col-span-1"
              )}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>

            <Button
              onClick={exportPDF}
              disabled={isExporting}
              className={cn(
                "sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white w-full rounded-full text-xs font-semibold",
                isMonth ? "col-span-2" : "col-span-1"
              )}
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Memproses...' : 'Export PDF'}
            </Button>
          </div>
        </div>
      </div>

      {/* REPORT CONTENT TO BE CAPTURED */}
      <div ref={reportRef} className="bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 rounded-3xl space-y-6 sm:space-y-8 print:bg-white print:text-black">

        {/* REPORT HEADER */}
        <div className="text-center pb-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xl sm:text-2xl font-bold dark:text-white">Fimo - Laporan Keuangan</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Periode: {isMonth
              ? `${MONTHS.find(m => m.value === String(selectedMonth))?.label} ${selectedYear}`
              : `30 Hari Terakhir (${formatIndonesianDate(startDateStr)} - ${formatIndonesianDate(endDateStr)})`
            }
            {selectedWallet && ` • Dompet: ${wallets.find(w => w.id === selectedWallet)?.name}`}
          </p>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 summary-grid">
          <Card className="col-span-1 report-card-animate opacity-0 bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30 relative min-h-[75px] sm:min-h-[105px] overflow-hidden">
            <CardContent className="p-2 sm:p-5 flex flex-col justify-between h-full">
              <div className="min-w-0 w-full pr-2 sm:pr-0">
                <p className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 opacity-80 truncate">Pemasukan</p>
                <h3 className="text-[12px] xs:text-sm sm:text-2xl font-extrabold sm:font-bold mt-0.5 tracking-tight text-emerald-700 dark:text-emerald-300 truncate">
                  {formatRupiah(totalIncome)}
                </h3>
              </div>
              <div className="absolute bottom-1.5 right-1.5 sm:bottom-4 sm:right-4 bg-emerald-100 dark:bg-emerald-900/40 p-1 sm:p-2.5 rounded-full flex items-center justify-center shadow-xs">
                <TrendingUp className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1 report-card-animate opacity-0 bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30 relative min-h-[75px] sm:min-h-[105px] overflow-hidden">
            <CardContent className="p-2 sm:p-5 flex flex-col justify-between h-full">
              <div className="min-w-0 w-full pr-2 sm:pr-0">
                <p className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400 opacity-80 truncate">Pengeluaran</p>
                <h3 className="text-[12px] xs:text-sm sm:text-2xl font-extrabold sm:font-bold mt-0.5 tracking-tight text-rose-700 dark:text-rose-300 truncate">
                  {formatRupiah(totalExpense)}
                </h3>
              </div>
              <div className="absolute bottom-1.5 right-1.5 sm:bottom-4 sm:right-4 bg-rose-100 dark:bg-rose-900/40 p-1 sm:p-2.5 rounded-full flex items-center justify-center shadow-xs">
                <TrendingDown className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-rose-600 dark:text-rose-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-2 md:col-span-1 report-card-animate opacity-0 bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 relative min-h-[75px] sm:min-h-[105px] overflow-hidden">
            <CardContent className="p-2 sm:p-5 flex flex-col justify-between h-full">
              <div className="min-w-0 w-full pr-2 sm:pr-0">
                <p className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 opacity-80 truncate">Arus Kas Bersih</p>
                <h3 className="text-[12px] xs:text-sm sm:text-2xl font-extrabold sm:font-bold mt-0.5 tracking-tight text-blue-700 dark:text-blue-300 truncate">
                  {formatRupiah(netSavings)}
                </h3>
              </div>
              <div className="absolute bottom-1.5 right-1.5 sm:bottom-4 sm:right-4 bg-blue-100 dark:bg-blue-900/40 p-1.5 sm:p-2.5 rounded-full flex items-center justify-center shadow-xs">
                <Wallet className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FIMO AI MONTHLY INSIGHTS */}
        <Card className={cn(
          "report-card-animate opacity-0 border-2 border-black dark:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] rounded-xl bg-card text-foreground overflow-hidden relative",
          !insight && "no-print-if-empty"
        )}>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-sm sm:text-lg font-extrabold flex items-center gap-2 text-foreground">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                Ulasan Finansial AI
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">Analisis pola spending bulanan dan tips efisiensi otomatis.</p>
            </div>
            {!insight && !isLoadingInsight && (
              <Button
                onClick={handleGenerateInsight}
                size="sm"
                className="bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black rounded-full text-xs font-bold px-4 border border-black dark:border-white"
              >
                Mulai Analisis
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-2">
            {isLoadingInsight && (
              <div className="py-12 flex flex-col items-center justify-center space-y-4">
                <motion.img
                  src="/mascot.png"
                  alt="Analyzing Mascot"
                  className="w-20 h-20 object-contain drop-shadow-md"
                  animate={{
                    y: [0, -10, 0],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <div className="flex items-center gap-2 text-foreground">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <p className="text-xs font-mono font-bold animate-pulse">Fimo AI sedang menganalisis keuangan Anda...</p>
                </div>
              </div>
            )}

            {!insight && !isLoadingInsight && (
              <div className="py-6 text-center border border-dashed border-border rounded-xl bg-slate-50/40 dark:bg-black/10">
                <p className="text-xs text-muted-foreground px-4">
                  Klik tombol <strong>Mulai Analisis</strong> di atas untuk memproses data keuangan periode ini menggunakan model AI Gemini.
                </p>
              </div>
            )}

            {insight && !isLoadingInsight && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="space-y-6"
              >
                {/* Upper block: Score and summary */}
                <div className="flex flex-col md:flex-row gap-4 items-start ai-upper-block">
                  {/* Circular Score display */}
                  <div className={cn(
                    "flex flex-col items-center justify-center h-20 w-20 sm:h-24 sm:w-24 rounded-full border-4 font-black flex-shrink-0 mx-auto md:mx-0 shadow-xs ai-score-circle",
                    getScoreColor(insight.financial_score)
                  )}>
                    <span className="text-2xl sm:text-3xl font-extrabold">{insight.financial_score}</span>
                    <span className="text-[9px] uppercase tracking-wider font-mono opacity-80 mt-0.5">Skor</span>
                  </div>

                  {/* Summary Text */}
                  <div className="flex-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-1 font-mono">Analisis Fimo:</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium">
                      {insight.summary}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 ai-details-grid">
                  {/* Tips list */}
                  <div className="bg-slate-50 dark:bg-neutral-900/60 p-4 rounded-xl border-2 border-black dark:border-white space-y-2.5">
                    <h5 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
                      <CheckCircle2 className="h-4 w-4" />
                      Rekomendasi Hemat
                    </h5>
                    <ul className="space-y-2">
                      {insight.tips.map((tip, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-2 leading-relaxed">
                          <span className="text-emerald-500 font-bold mt-0.5">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Warnings list */}
                  {insight.warnings && insight.warnings.length > 0 && (
                    <div className="bg-slate-50 dark:bg-neutral-900/60 p-4 rounded-xl border-2 border-black dark:border-white space-y-2.5">
                      <h5 className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 uppercase tracking-wide">
                        <AlertTriangle className="h-4 w-4" />
                        Peringatan Pengeluaran
                      </h5>
                      <ul className="space-y-2">
                        {insight.warnings.map((warn, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-2 leading-relaxed">
                            <span className="text-rose-500 font-bold mt-0.5">•</span>
                            <span>{warn}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Collapsible Gajian Tip */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-neutral-800">
              <button
                onClick={() => setShowGajianTip(!showGajianTip)}
                className="flex items-center justify-between w-full text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  💡 Tip Analisis Siklus Gajian
                </span>
                <span className="text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">
                  {showGajianTip ? 'Sembunyikan' : 'Lihat'}
                </span>
              </button>
              
              {showGajianTip && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-2 text-xs text-muted-foreground leading-relaxed bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 rounded-xl p-3"
                >
                  Jika hari gajian Anda tidak jatuh di awal bulan (misalnya tanggal 25 atau 30), disarankan untuk memilih penyaringan rentang waktu <strong>&ldquo;30 Hari Terakhir&rdquo;</strong> pada opsi di atas. Ini membantu Fimo menganalisis pemasukan dan pengeluaran Anda pasca-gajian secara lebih presisi, alih-alih terbagi dalam dua bulan kalender yang berbeda.
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* CHARTS */}
        <div className="grid grid-cols-2 gap-3 md:gap-8 charts-grid">
          <Card className="col-span-1 report-card-animate opacity-0">
            <CardHeader className="p-3 md:p-6 pb-0 md:pb-2">
              <CardTitle className="text-xs sm:text-lg font-bold">Distribusi Pengeluaran</CardTitle>
            </CardHeader>
            <CardContent className="p-2 md:p-6 pt-2 md:pt-0">
              {categoryChartData.length > 0 ? (
                <>
                  {/* Pie Chart di atas */}
                  <CategoryPieChart data={categoryChartData} height={isMobile && !isExporting ? 130 : 260} />

                  {/* Legenda Keterangan & Nominal di bawah (Layout Vertikal Stacked) */}
                  <div className={cn(
                    "mt-2 overflow-y-auto pr-1 category-details-list",
                    isMobile && !isExporting ? "space-y-1 max-h-[120px]" : "grid grid-cols-2 gap-1.5 max-h-[140px]"
                  )}>
                    {categoryChartData.map((cat, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "flex items-center justify-between rounded-xl bg-white/40 dark:bg-black/10 border border-slate-100/50 dark:border-slate-800/50 hover:bg-white dark:hover:bg-neutral-800/80 transition-all duration-200 shadow-3xs",
                          isMobile && !isExporting ? "p-1 px-2 text-[10px]" : "p-1.5 px-2.5 text-xs"
                        )}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className="w-1.5 h-1.5 rounded-full mr-2 shrink-0 border border-black/5 dark:border-white/5" style={{ backgroundColor: cat.color }} />
                          <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">{cat.name}</span>
                        </div>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-100 shrink-0 ml-1.5">{formatRupiah(cat.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ height: isMobile ? 150 : 260 }} className="flex items-center justify-center text-slate-400 text-xs sm:text-sm text-center p-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  Belum ada data pengeluaran periode ini.
                </div>
              )}
            </CardContent>
          </Card>

            <Dialog>
              <DialogTrigger
                render={
                  <Card className="col-span-1 report-card-animate opacity-0 cursor-pointer hover:border-black dark:hover:border-white transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] duration-200">
                    <CardHeader className="p-3 md:p-6 pb-0 md:pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-xs sm:text-lg font-bold">Tren 6 Bulan Terakhir</CardTitle>
                      <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">Detail</span>
                    </CardHeader>
                    <CardContent className="p-2 md:p-6 pt-2 md:pt-0">
                      <SixMonthTrendChart data={trendChartData} height={isMobile ? 200 : 300} />
                    </CardContent>
                  </Card>
                }
              />
              <DialogContent className="max-w-[640px] w-[92vw] rounded-2xl p-6 md:p-8 bg-white dark:bg-slate-900 border-2 border-black dark:border-white shadow-[8px_8px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_rgba(255,255,255,0.15)] overflow-y-auto max-h-[90vh]">
                <DialogHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
                  <DialogTitle className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-indigo-500" />
                    Analisis Tren 6 Bulan Terakhir
                  </DialogTitle>
                  <DialogDescription className="text-xs text-neutral-500 dark:text-neutral-400">
                    Detail perkembangan arus kas (pemasukan & pengeluaran) setengah tahun ke belakang.
                  </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-6">
                  {/* Large Chart */}
                  <div className="bg-slate-50 dark:bg-neutral-900/40 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800">
                    <SixMonthTrendChart data={trendChartData} height={320} />
                  </div>

                  {/* Detailed Table */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Tabel Arus Kas Bulanan:</h4>
                    <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-800 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-zinc-900/50 text-neutral-500 font-bold border-b border-neutral-200 dark:border-neutral-800">
                            <th className="p-3">Periode</th>
                            <th className="p-3 text-right">Pemasukan</th>
                            <th className="p-3 text-right">Pengeluaran</th>
                            <th className="p-3 text-right">Bersih</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-150 dark:divide-neutral-800">
                          {trendChartData.map((row, i) => {
                            const net = row.income - row.expense
                            return (
                              <tr key={i} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors">
                                <td className="p-3 font-semibold text-neutral-800 dark:text-neutral-200">{row.date}</td>
                                <td className="p-3 text-right text-emerald-600 font-mono font-bold">{formatRupiah(row.income)}</td>
                                <td className="p-3 text-right text-rose-600 font-mono font-bold">{formatRupiah(row.expense)}</td>
                                <td className={cn(
                                  "p-3 text-right font-mono font-bold",
                                  net >= 0 ? "text-blue-600 dark:text-blue-400" : "text-amber-600"
                                )}>{formatRupiah(net)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

      {/* EVENT WALLETS REPORTS SECTION */}
      {eventWallets.length > 0 && (
        <div className="space-y-6 pt-6 border-t border-slate-200 dark:border-slate-800 report-card-animate opacity-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-lg font-bold dark:text-white">Analisis Dompet Event & Liburan</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {eventWallets.map(w => {
              const trxs = eventTransactions.filter(t => t.wallet_id === w.id)
              const income = trxs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
              const expense = trxs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
              const balance = income - expense

              return (
                <Card key={w.id} className="border-2 border-black dark:border-slate-800 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.05)] rounded-2xl overflow-hidden">
                  <CardHeader className="bg-slate-100/60 dark:bg-slate-900/50 pb-3 flex flex-row items-center justify-between border-b border-border/60">
                    <div>
                      <CardTitle className="text-base font-bold">{w.name}</CardTitle>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Dompet Khusus Event / Perjalanan</p>
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-500/20">
                      Event
                    </span>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5 space-y-4">
                    {/* Mini Summary Grid */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-2">
                        <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Masuk</p>
                        <p className="text-xs font-mono font-bold text-emerald-650 dark:text-emerald-300 mt-0.5">{formatRupiah(income)}</p>
                      </div>
                      <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-2">
                        <p className="text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide">Keluar</p>
                        <p className="text-xs font-mono font-bold text-rose-655 dark:text-rose-300 mt-0.5">{formatRupiah(expense)}</p>
                      </div>
                      <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-2">
                        <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Bersih</p>
                        <p className="text-xs font-mono font-bold text-blue-650 dark:text-blue-300 mt-0.5">{formatRupiah(balance)}</p>
                      </div>
                    </div>

                    {/* Transaction List */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Daftar Transaksi:</h4>
                      {trxs.length > 0 ? (
                        <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                          {trxs.map((t, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs p-2 rounded-xl bg-white dark:bg-black/10 border border-slate-100 dark:border-slate-800 shadow-3xs">
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-slate-850 dark:text-slate-200 truncate">{t.description || 'Tanpa deskripsi'}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {t.categories?.name || 'Kategori'} • {formatIndonesianDate(t.transaction_date)}
                                </p>
                              </div>
                              <span className={cn(
                                "font-mono font-bold ml-3 shrink-0",
                                t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                              )}>
                                {t.type === 'income' ? '+' : '-'}{formatRupiah(Number(t.amount))}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 text-center py-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                          Belum ada transaksi di dompet ini untuk periode ini.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

    </div>
    </div>
  )
}
