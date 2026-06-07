'use client'

import { useState, useRef, useEffect } from 'react'
import { Download, TrendingUp, TrendingDown, Wallet, Sparkles, BrainCircuit, AlertTriangle, CheckCircle2, Loader2, Info } from 'lucide-react'
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
    
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
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
      setIsExporting(false)
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

  const walletOptions = [
    { value: 'all', label: 'Semua Dompet' },
    ...wallets.map(w => ({ value: w.id, label: w.name }))
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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <Card className="col-span-1 bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30 relative min-h-[75px] sm:min-h-[105px] overflow-hidden">
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
          
          <Card className="col-span-1 bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30 relative min-h-[75px] sm:min-h-[105px] overflow-hidden">
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

          <Card className="col-span-2 md:col-span-1 bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 relative min-h-[75px] sm:min-h-[105px] overflow-hidden">
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

        {/* CHARTS */}
        <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 md:gap-8">
          <Card className="col-span-1">
            <CardHeader className="p-3 md:p-6 pb-0 md:pb-2">
              <CardTitle className="text-xs sm:text-lg font-bold">Distribusi Pengeluaran</CardTitle>
            </CardHeader>
            <CardContent className="p-2 md:p-6 pt-2 md:pt-0">
              {categoryChartData.length > 0 ? (
                <CategoryPieChart data={categoryChartData} height={isMobile ? 150 : 260} />
              ) : (
                <div style={{ height: isMobile ? 150 : 260 }} className="flex items-center justify-center text-slate-400 text-xs sm:text-sm text-center p-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  Belum ada data pengeluaran periode ini.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardHeader className="p-3 md:p-6 pb-0 md:pb-2">
              <CardTitle className="text-xs sm:text-lg font-bold">Tren 6 Bulan Terakhir</CardTitle>
            </CardHeader>
            <CardContent className="p-2 md:p-6 pt-2 md:pt-0">
              <SixMonthTrendChart data={trendChartData} height={isMobile ? 150 : 300} />
            </CardContent>
          </Card>
        </div>

        {/* Tip Siklus Gajian */}
        <div className="bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-4 flex gap-3 text-xs text-blue-700 dark:text-blue-300 shadow-xs">
          <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">💡 Tip Analisis Siklus Gajian</p>
            <p className="leading-relaxed">
              Jika hari gajian Anda tidak jatuh di awal bulan (misalnya tanggal 25 atau 30), disarankan untuk memilih penyaringan rentang waktu <strong>&ldquo;30 Hari Terakhir&rdquo;</strong> pada opsi di atas. Ini membantu Fimo menganalisis pemasukan dan pengeluaran Anda pasca-gajian secara lebih presisi, alih-alih terbagi dalam dua bulan kalender yang berbeda.
            </p>
          </div>
        </div>

        {/* FIMO AI MONTHLY INSIGHTS */}
        <Card className="border-indigo-100 dark:border-indigo-950/30 overflow-hidden relative bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/40 dark:from-indigo-950/10 dark:via-card/40 dark:to-purple-950/10 backdrop-blur-md rounded-2xl shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-sm sm:text-lg font-bold flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 animate-pulse" />
                Analisis Finansial AI Fimo
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">Analisis pola spending bulanan dan tips efisiensi otomatis.</p>
            </div>
            {!insight && !isLoadingInsight && (
              <Button
                onClick={handleGenerateInsight}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs font-semibold px-4"
              >
                <BrainCircuit className="h-4 w-4 mr-2" />
                Analisis
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-2">
            {isLoadingInsight && (
              <div className="py-12 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono animate-pulse">Fimo sedang menganalisis pola keuangan Anda...</p>
              </div>
            )}

            {!insight && !isLoadingInsight && (
              <div className="py-6 text-center border border-dashed border-indigo-100 dark:border-indigo-950/40 rounded-xl bg-white/40 dark:bg-black/10">
                <p className="text-xs text-muted-foreground px-4">
                  Klik tombol <strong>Analisis</strong> di atas untuk memproses data keuangan periode ini menggunakan model AI Gemini.
                </p>
              </div>
            )}

            {insight && !isLoadingInsight && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Upper block: Score and summary */}
                <div className="flex flex-col md:flex-row gap-4 items-start">
                  {/* Circular Score display */}
                  <div className={cn(
                    "flex flex-col items-center justify-center h-20 w-20 sm:h-24 sm:w-24 rounded-full border-4 font-black flex-shrink-0 mx-auto md:mx-0 shadow-xs",
                    getScoreColor(insight.financial_score)
                  )}>
                    <span className="text-2xl sm:text-3xl font-extrabold">{insight.financial_score}</span>
                    <span className="text-[9px] uppercase tracking-wider font-mono opacity-80 mt-0.5">Skor</span>
                  </div>

                  {/* Summary Text */}
                  <div className="flex-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 mb-1">Analisis Fimo:</h4>
                    <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed font-medium">
                      {insight.summary}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Tips list */}
                  <div className="bg-white/60 dark:bg-neutral-900/40 p-4 rounded-xl border border-indigo-50 dark:border-indigo-950/20 space-y-2.5">
                    <h5 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
                      <CheckCircle2 className="h-4 w-4" />
                      Rekomendasi Hemat Fimo
                    </h5>
                    <ul className="space-y-2">
                      {insight.tips.map((tip, i) => (
                        <li key={i} className="text-xs text-neutral-600 dark:text-neutral-400 flex items-start gap-2 leading-relaxed">
                          <span className="text-emerald-500 font-bold mt-0.5">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Warnings list */}
                  {insight.warnings && insight.warnings.length > 0 && (
                    <div className="bg-white/60 dark:bg-neutral-900/40 p-4 rounded-xl border border-indigo-50 dark:border-indigo-950/20 space-y-2.5">
                      <h5 className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 uppercase tracking-wide">
                        <AlertTriangle className="h-4 w-4" />
                        Peringatan Pengeluaran
                      </h5>
                      <ul className="space-y-2">
                        {insight.warnings.map((warn, i) => (
                          <li key={i} className="text-xs text-neutral-600 dark:text-neutral-400 flex items-start gap-2 leading-relaxed">
                            <span className="text-rose-500 font-bold mt-0.5">•</span>
                            <span>{warn}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
      </div>
    </div>
  )
}
