'use client'

import { useState, useRef } from 'react'
import { Download, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { InlineSelect } from '@/components/ui/inline-select'
import { toast } from 'sonner'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { CategoryPieChart, SixMonthTrendChart } from '@/components/dashboard/DashboardCharts'
// Note: We are reusing the dashboard charts, but transforming the data differently for Reports

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
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
  selectedWallet
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
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reportRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)

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
  // We need to group by YYYY-MM
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"]
  const trendMap = new Map<string, { income: number, expense: number }>()
  
  // Initialize last 6 months to ensure they show even if 0
  for (let i = 5; i >= 0; i--) {
    const d = new Date(selectedYear, selectedMonth - 1 - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    trendMap.set(key, { income: 0, expense: 0 })
  }

  sixMonthTransactions.forEach(t => {
    const d = new Date(t.transaction_date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
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
      pdf.save(`Laporan_Keuangan_Fimo_${MONTHS.find(m => m.value === String(selectedMonth))?.label}_${selectedYear}.pdf`)
      
      toast.success('Laporan berhasil diunduh')
    } catch (error) {
      console.error(error)
      toast.error('Gagal membuat PDF')
    } finally {
      setIsExporting(false)
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

  return (
    <div className="space-y-8">
      {/* HEADER & FILTERS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight dark:text-white">Laporan Keuangan</h1>
          <p className="text-slate-500 dark:text-slate-400">Analisis pengeluaran dan pemasukan bulanan.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-32">
            <InlineSelect 
              options={MONTHS} 
              value={String(selectedMonth)} 
              onChange={(v) => updateFilters('month', v)} 
            />
          </div>
          <div className="w-24">
            <InlineSelect 
              options={yearOptions} 
              value={String(selectedYear)} 
              onChange={(v) => updateFilters('year', v)} 
            />
          </div>
          <div className="w-40">
            <InlineSelect 
              options={walletOptions} 
              value={selectedWallet || 'all'} 
              onChange={(v) => updateFilters('wallet', v)} 
            />
          </div>
          <Button 
            onClick={exportPDF} 
            disabled={isExporting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Memproses...' : 'Export PDF'}
          </Button>
        </div>
      </div>

      {/* REPORT CONTENT TO BE CAPTURED */}
      <div ref={reportRef} className="bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl space-y-8 print:bg-white print:text-black">
        
        {/* REPORT HEADER (Visible mostly in PDF) */}
        <div className="text-center pb-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-2xl font-bold dark:text-white">Fimo - Laporan Keuangan</h2>
          <p className="text-slate-500 dark:text-slate-400">
            Periode: {MONTHS.find(m => m.value === String(selectedMonth))?.label} {selectedYear}
            {selectedWallet && ` • Dompet: ${wallets.find(w => w.id === selectedWallet)?.name}`}
          </p>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Pemasukan</p>
                  <h3 className="text-2xl font-bold mt-1 text-emerald-700 dark:text-emerald-300">
                    {formatRupiah(totalIncome)}
                  </h3>
                </div>
                <div className="bg-emerald-100 dark:bg-emerald-900/50 p-3 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-rose-600 dark:text-rose-400">Pengeluaran</p>
                  <h3 className="text-2xl font-bold mt-1 text-rose-700 dark:text-rose-300">
                    {formatRupiah(totalExpense)}
                  </h3>
                </div>
                <div className="bg-rose-100 dark:bg-rose-900/50 p-3 rounded-xl">
                  <TrendingDown className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Sisa / Tabungan</p>
                  <h3 className="text-2xl font-bold mt-1 text-blue-700 dark:text-blue-300">
                    {formatRupiah(netSavings)}
                  </h3>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-xl">
                  <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Distribusi Pengeluaran</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryChartData.length > 0 ? (
                <CategoryPieChart data={categoryChartData} />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-400">
                  Belum ada data pengeluaran bulan ini.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tren 6 Bulan Terakhir</CardTitle>
            </CardHeader>
            <CardContent>
              <SixMonthTrendChart data={trendChartData} />
            </CardContent>
          </Card>
        </div>
        
      </div>
    </div>
  )
}
