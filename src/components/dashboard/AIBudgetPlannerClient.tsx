'use client'

import { useState, useTransition, ComponentType } from 'react'
import { useRouter } from 'next/navigation'
import * as LucideIcons from 'lucide-react'
import { cn } from '@/lib/utils'
import { getPastelColor } from '@/lib/colors'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { generateAIBudgetPlan, deleteAIBudgetPlan, AIBudgetPlan } from '@/actions/ai-budget'
import { setBudget } from '@/actions/budgets'

interface WalletRow {
  id: string
  name: string
  type: string
  balance: number
  color: string
  icon: string
}

interface CategoryRow {
  id: string
  name: string
  icon: string
  color: string
}

interface BudgetCategory {
  category_id: string
  category_name: string
  category_icon: string
  category_color: string
  budget_id: string | null
  budget_limit: number
  spent: number
}

interface AIBudgetPlannerClientProps {
  initialWallets: WalletRow[]
  initialCategories: CategoryRow[]
  initialBudgets: BudgetCategory[]
  initialCachedPlan: AIBudgetPlan | null
  currentMonth: number
  currentYear: number
  totalIncome: number
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

export function AIBudgetPlannerClient({
  initialWallets,
  initialCategories,
  initialBudgets,
  initialCachedPlan,
  currentMonth,
  currentYear,
  totalIncome: initialIncome
}: AIBudgetPlannerClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<'budget' | 'savings'>('budget')
  
  // AI Plan states
  const [plan, setPlan] = useState<AIBudgetPlan | null>(initialCachedPlan)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isApplying, setIsApplying] = useState(false)

  // User customization states
  const [customLimits, setCustomLimits] = useState<Record<string, number>>(() => {
    const limits: Record<string, number> = {}
    if (initialCachedPlan) {
      initialCachedPlan.budgets.forEach((b) => {
        limits[b.category_id] = b.recommended_limit
      })
    }
    return limits
  })

  // Savings projection states
  const [selectedBank, setSelectedBank] = useState<string>('Bank Jago')
  const [monthlySavings, setMonthlySavings] = useState<number>(500000) // Default Rp 500.000

  // Calculate total wallets balance
  const totalBalance = initialWallets.reduce((sum, w) => sum + Number(w.balance || 0), 0)

  // Use AI cached plan total income or fallback to prop initialIncome
  const totalIncome = plan?.total_income ?? initialIncome

  // Generate Plan via Server Action
  const handleGeneratePlan = async () => {
    setIsGenerating(true)
    try {
      const res = await generateAIBudgetPlan(currentMonth, currentYear)
      if (res.success && res.data) {
        setPlan(res.data)
        // Initialize custom limits
        const limits: Record<string, number> = {}
        res.data.budgets.forEach((b) => {
          limits[b.category_id] = b.recommended_limit
        })
        setCustomLimits(limits)
        
        // Default savings projection to Jago or first bank
        if (res.data.savings_recommendations.length > 0) {
          setSelectedBank(res.data.savings_recommendations[0].institution)
        }
        
        toast.success('Rencana anggaran AI berhasil dibuat!')
      } else {
        toast.error(res.error || 'Gagal menghasilkan rencana budget AI.')
      }
    } catch (err) {
      console.error('Error generating AI plan:', err)
      toast.error('Terjadi kesalahan sistem saat membuat rencana AI.')
    } finally {
      setIsGenerating(false)
    }
  }

  // Delete Plan cache
  const handleDeletePlan = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus rencana budget AI ini dan membuat ulang?')) return
    startTransition(async () => {
      try {
        const res = await deleteAIBudgetPlan()
        if (res.success) {
          setPlan(null)
          setCustomLimits({})
          toast.success('Rencana AI berhasil dihapus.')
        } else {
          toast.error(res.error || 'Gagal menghapus rencana.')
        }
      } catch (err) {
        console.error('Error deleting AI plan:', err)
        toast.error('Gagal menghapus rencana.')
      }
    })
  }

  // Apply budgets to actual budget database
  const handleApplyBudgets = async () => {
    setIsApplying(true)
    try {
      let successCount = 0
      let failedCount = 0
      
      const promises = Object.entries(customLimits).map(async ([catId, amount]) => {
        const res = await setBudget(catId, amount, currentMonth, currentYear)
        if (res.success) {
          successCount++
        } else {
          failedCount++
        }
      })

      await Promise.all(promises)

      if (failedCount === 0) {
        toast.success(`Berhasil menerapkan ${successCount} anggaran pengeluaran!`)
        router.push('/dashboard/budgets')
        router.refresh()
      } else {
        toast.warning(`Berhasil menerapkan ${successCount} anggaran, namun ${failedCount} gagal.`)
      }
    } catch (err) {
      console.error('Error applying AI budgets:', err)
      toast.error('Gagal menerapkan anggaran ke database.')
    } finally {
      setIsApplying(false)
    }
  }

  // Calculate unallocated budget based on custom limits
  const totalCustomAllocated = initialCategories.reduce((sum, cat) => {
    return sum + (customLimits[cat.id] || 0)
  }, 0)

  // Savings compounding calculator
  const getSelectedBankDetails = () => {
    if (!plan) return null
    return plan.savings_recommendations.find(s => s.institution === selectedBank) || plan.savings_recommendations[0]
  }

  const bankDetails = getSelectedBankDetails()
  const rate = bankDetails ? parseFloat(String(bankDetails.rate_pct)) || 3.75 : 3.75
  const rm = rate / 100 / 12 // monthly rate

  // FV = P * (((1 + rm)^n - 1) / rm)
  const calculateFV = (months: number) => {
    if (rm === 0 || isNaN(rm)) return monthlySavings * months
    return Math.round(monthlySavings * ((Math.pow(1 + rm, months) - 1) / rm))
  }

  const fv1Yr = calculateFV(12)
  const fv3Yr = calculateFV(36)
  const totalPrincipal1Yr = monthlySavings * 12
  const totalPrincipal3Yr = monthlySavings * 36
  const profit1Yr = fv1Yr - totalPrincipal1Yr
  const profit3Yr = fv3Yr - totalPrincipal3Yr

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 pb-28 md:pb-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight dark:text-white flex items-center gap-2">
          <LucideIcons.Sparkles className="h-7 w-7 text-indigo-500 fill-indigo-500/10" />
          Perencana Anggaran AI
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Rancang pembagian budget cerdas dan maksimalkan keuntungan tabungan Anda untuk {INDONESIAN_MONTHS[currentMonth - 1]} {currentYear}.
        </p>
      </div>

      {!plan ? (
        /* HERO GENERATE SCREEN */
        <div className="bg-[#c5b0f4] text-black border-4 border-black p-8 md:p-12 rounded-3xl shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <span className="bg-black text-white px-3 py-1 text-xs font-mono font-bold rounded-full uppercase tracking-wider">
              Powered by Llama 3.3
            </span>
            <h2 className="text-3xl font-black leading-none tracking-tight">
              Butuh bantuan mengatur keuangan bulan ini?
            </h2>
            <p className="text-base font-semibold leading-relaxed opacity-90">
              Fimo AI akan menganalisis portofolio dompet dan transaksi terakhir Anda untuk merancang alokasi budget ideal per kategori. Selain itu, Anda akan mendapatkan rekomendasi bank terbaik dengan bunga tinggi untuk menyimpan sisa uang Anda secara aman.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-1.5 text-xs font-bold font-mono">
                <LucideIcons.Check className="h-4 w-4 stroke-[3]" />
                Auto-Analyze Dompet & Transaksi
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold font-mono">
                <LucideIcons.Check className="h-4 w-4 stroke-[3]" />
                Rekomendasi Bunga Digital Bank
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold font-mono">
                <LucideIcons.Check className="h-4 w-4 stroke-[3]" />
                Simulasi Investasi Interaktif
              </div>
            </div>
          </div>

          <div className="shrink-0 w-full md:w-auto">
            <Button
              onClick={handleGeneratePlan}
              disabled={isGenerating}
              className="w-full md:w-auto h-16 px-8 text-lg font-black bg-black hover:bg-zinc-800 text-white border-2 border-black rounded-full shadow-[4px_4px_0px_rgba(255,255,255,1)] hover:translate-x-0.5 hover:translate-y-0.5 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <LucideIcons.Loader2 className="h-6 w-6 animate-spin" />
                  Menganalisis Finansial...
                </>
              ) : (
                <>
                  <LucideIcons.Sparkles className="h-5 w-5 fill-white/20" />
                  Hasilkan Rencana Anggaran
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        /* PLAN DETAILS SCREEN */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT/MAIN SECTION (2 Columns) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Cashflow & Financial Analysis Banner */}
            <div className="bg-[#f4ecd6] dark:bg-zinc-800/40 text-black dark:text-white border-2 border-black dark:border-white p-6 rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] space-y-4">
              <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <LucideIcons.BrainCircuit className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  <h3 className="font-black text-lg">Ulasan Finansial AI</h3>
                </div>
                <span className="text-[10px] font-mono font-bold bg-amber-200 dark:bg-amber-900/60 text-amber-950 dark:text-amber-100 px-2 py-0.5 rounded-full uppercase">
                  Fimo Coach
                </span>
              </div>
              <div className="space-y-3 text-sm leading-relaxed">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {plan.analysis.summary}
                </p>
                <div className="p-3 bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-xl flex gap-2">
                  <LucideIcons.AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-xs uppercase tracking-wider text-slate-400 font-mono">Tindakan Prioritas:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{plan.analysis.priority_action}</span>
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-xl flex gap-2">
                  <LucideIcons.HeartPulse className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-xs uppercase tracking-wider text-slate-400 font-mono">Tips Kesehatan Finansial:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{plan.analysis.saving_tips}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Tabs Selector */}
            <div className="flex border-b border-slate-200 dark:border-zinc-800 gap-1 p-1 bg-slate-100 dark:bg-zinc-950 rounded-xl w-fit">
              <button
                onClick={() => setActiveTab('budget')}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-black transition-all border-none flex items-center gap-1.5",
                  activeTab === 'budget'
                    ? "bg-black text-white dark:bg-white dark:text-black shadow-sm"
                    : "text-slate-500 dark:text-slate-400"
                )}
              >
                <LucideIcons.Sliders className="h-4 w-4" />
                Atur Batas Anggaran
              </button>
              <button
                onClick={() => setActiveTab('savings')}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-black transition-all border-none flex items-center gap-1.5",
                  activeTab === 'savings'
                    ? "bg-black text-white dark:bg-white dark:text-black shadow-sm"
                    : "text-slate-500 dark:text-slate-400"
                )}
              >
                <LucideIcons.Coins className="h-4 w-4" />
                Simulasi Tabungan & Investasi
              </button>
            </div>

            {/* TAB CONTENT: BUDGETS SETUP */}
            {activeTab === 'budget' && (
              <div className="space-y-6">
                
                {/* Allocation Summary Tracker */}
                <div className="bg-[#c8e6cd] text-black border-2 border-black p-4 rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,1)] flex items-center justify-between flex-wrap gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold font-mono text-emerald-950 uppercase tracking-widest">
                      Total Anggaran Anda
                    </span>
                    <div className="text-xl font-black">
                      {formatRupiah(totalCustomAllocated)}
                    </div>
                  </div>
                  <div className="h-10 w-px bg-black/10 hidden sm:block" />
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold font-mono text-emerald-950 uppercase tracking-widest">
                      Unallocated Savings Target (Sisa untuk Tabungan)
                    </span>
                    <div className={cn("text-xl font-black", (totalIncome - totalCustomAllocated >= 0) ? "text-emerald-800" : "text-rose-700")}>
                      {formatRupiah(Math.max(0, totalIncome - totalCustomAllocated))}
                    </div>
                  </div>
                </div>

                {/* Categories recommendation list */}
                <div className="space-y-4">
                  <h4 className="font-black text-lg dark:text-white flex items-center gap-2">
                    <LucideIcons.Settings2 className="h-5 w-5 text-indigo-500" />
                    Kustomisasi Anggaran Kategori
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {initialCategories.map((cat, idx) => {
                      const limit = customLimits[cat.id] ?? 0
                      const aiRec = plan.budgets.find(b => b.category_id === cat.id)
                      const spent = initialBudgets.find(b => b.category_id === cat.id)?.spent ?? 0
                      const pastelBg = getPastelColor(cat.color, idx)
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const Icon = (LucideIcons as any)[cat.icon || 'Tag'] || LucideIcons.Tag

                      return (
                        <div
                          key={cat.id}
                          className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-white p-4 rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(255,255,255,0.15)] flex flex-col justify-between space-y-4"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-8 h-8 rounded-full border border-black/10 flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: pastelBg }}
                                >
                                  <Icon className="h-4 w-4 text-black" />
                                </span>
                                <div>
                                  <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100 block">
                                    {cat.name}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    Terpakai bulan ini: {formatRupiah(spent)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {aiRec && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 italic leading-relaxed border-l-2 border-indigo-500/30 pl-2">
                                AI: {aiRec.reason}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                            <div className="flex justify-between items-center text-xs font-bold font-mono">
                              <span className="text-slate-400">Batas Budget:</span>
                              <span className="text-slate-900 dark:text-white font-extrabold text-sm">
                                {formatRupiah(limit)}
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max={Math.max(5000000, limit * 2, spent * 2)}
                              step="50000"
                              value={limit}
                              onChange={(e) => {
                                setCustomLimits((prev) => ({
                                  ...prev,
                                  [cat.id]: parseInt(e.target.value) || 0
                                }))
                              }}
                              className="w-full accent-indigo-500 h-2 bg-slate-100 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                            />
                            {aiRec && aiRec.recommended_limit !== limit && (
                              <button
                                onClick={() => {
                                  setCustomLimits((prev) => ({
                                    ...prev,
                                    [cat.id]: aiRec.recommended_limit
                                  }))
                                }}
                                className="text-[10px] text-indigo-500 hover:text-indigo-600 font-bold flex items-center gap-1 border-none bg-transparent p-0 mt-1 cursor-pointer"
                              >
                                <LucideIcons.RotateCcw className="h-3 w-3" />
                                Reset ke Rekomendasi AI ({formatRupiah(aiRec.recommended_limit)})
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Apply button */}
                <div className="flex gap-4">
                  <Button
                    onClick={handleApplyBudgets}
                    disabled={isApplying}
                    className="h-12 px-6 font-black bg-black dark:bg-white text-white dark:text-black border-2 border-black dark:border-white rounded-xl shadow-[4px_4px_0px_rgba(0,0,0,0.15)] flex items-center justify-center gap-2 hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                  >
                    {isApplying ? (
                      <>
                        <LucideIcons.Loader2 className="h-5 w-5 animate-spin" />
                        Menerapkan Anggaran...
                      </>
                    ) : (
                      <>
                        <LucideIcons.CheckSquare className="h-5 w-5" />
                        Terapkan Kustomisasi Anggaran Bulan Ini
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* TAB CONTENT: SAVINGS PROJECTIONS */}
            {activeTab === 'savings' && (
              <div className="space-y-6">
                
                {/* Simulator Inputs & Projections */}
                <div className="bg-[#efd4d4] text-black border-2 border-black p-6 rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)] space-y-6">
                  <div>
                    <h4 className="text-lg font-black flex items-center gap-2">
                      <LucideIcons.Calculator className="h-5 w-5" />
                      Simulasi Keuntungan Tabungan/Investasi
                    </h4>
                    <p className="text-xs font-semibold opacity-80 mt-1">
                      Simulasikan pertumbuhan dana tabungan Anda berdasarkan rekomendasi instrumen perbankan lokal.
                    </p>
                  </div>

                  {/* Savings Amount Slider */}
                  <div className="space-y-2 bg-white/60 p-4 rounded-xl border border-black/10">
                    <div className="flex justify-between items-center text-sm font-black font-mono">
                      <span>Nominal Ditabung Bulanan:</span>
                      <span className="text-base font-extrabold">
                        {formatRupiah(monthlySavings)} / Bulan
                      </span>
                    </div>
                    <input
                      type="range"
                      min="100000"
                      max="10000000"
                      step="100000"
                      value={monthlySavings}
                      onChange={(e) => setMonthlySavings(parseInt(e.target.value) || 100000)}
                      className="w-full accent-rose-500 h-2 bg-white/40 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-bold font-mono opacity-50">
                      <span>Rp 100rb</span>
                      <span>Rp 5jt</span>
                      <span>Rp 10jt</span>
                    </div>
                  </div>

                  {/* Savings Destination Selector */}
                  <div className="space-y-3">
                    <span className="text-xs font-black font-mono uppercase tracking-wider block opacity-70">
                      Pilih Bank / Alat Investasi:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {plan.savings_recommendations.map((sav) => (
                        <button
                          key={sav.institution}
                          onClick={() => setSelectedBank(sav.institution)}
                          className={cn(
                            "p-3 rounded-xl border-2 text-left font-black transition-all flex flex-col justify-between h-20 active:scale-95",
                            selectedBank === sav.institution
                              ? "bg-black text-white border-black shadow-none"
                              : "bg-white text-black border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-slate-50"
                          )}
                        >
                          <span className="text-xs truncate w-full">{sav.institution}</span>
                          <span className="text-[10px] font-mono text-indigo-400 font-extrabold">
                            {sav.rate_pct}% p.a.
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Projections Results */}
                  {bankDetails && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      {/* Projection 1 Year */}
                      <div className="bg-white p-4 rounded-xl border border-black/10 space-y-2">
                        <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-widest block">
                          Proyeksi Akumulasi Dana (1 Tahun)
                        </span>
                        <div className="text-2xl font-black text-black leading-none">
                          {formatRupiah(fv1Yr)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono font-bold leading-normal">
                          - Setoran Pokok: {formatRupiah(totalPrincipal1Yr)}<br />
                          - Estimasi Bunga Bersih: <span className="text-emerald-600">+{formatRupiah(profit1Yr)}</span>
                        </div>
                      </div>

                      {/* Projection 3 Years */}
                      <div className="bg-white p-4 rounded-xl border border-black/10 space-y-2">
                        <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-widest block">
                          Proyeksi Akumulasi Dana (3 Tahun)
                        </span>
                        <div className="text-2xl font-black text-black leading-none">
                          {formatRupiah(fv3Yr)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono font-bold leading-normal">
                          - Setoran Pokok: {formatRupiah(totalPrincipal3Yr)}<br />
                          - Estimasi Bunga Bersih: <span className="text-emerald-600">+{formatRupiah(profit3Yr)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Savings recommendations card details */}
                <div className="space-y-4">
                  <h4 className="font-black text-lg dark:text-white flex items-center gap-2">
                    <LucideIcons.ShieldAlert className="h-5 w-5 text-rose-500" />
                    Analisis Keuntungan & Cara Menabung
                  </h4>
                  <div className="space-y-3">
                    {plan.savings_recommendations.map((sav) => (
                      <div
                        key={sav.institution}
                        className={cn(
                          "p-4 rounded-xl border-2 border-black dark:border-white bg-white dark:bg-zinc-900 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",
                          selectedBank === sav.institution ? "shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] ring-2 ring-indigo-500" : "opacity-85"
                        )}
                      >
                        <div className="space-y-1 max-w-xl">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                              {sav.institution}
                            </span>
                            <span className="text-[9px] font-bold font-mono uppercase bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md">
                              {sav.type === 'bank' ? '🏦 Bank Digital' : '📈 Reksa/SBN'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            {sav.description}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-slate-400 block font-mono">Bunga / Return:</span>
                          <span className="text-base font-black text-indigo-500">
                            {sav.rate_pct}% p.a.
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR (1 Column) */}
          <div className="space-y-6">
            
            {/* Action buttons (Re-plan / Delete) */}
            <div className="bg-white dark:bg-zinc-950 border-2 border-black dark:border-white p-5 rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] space-y-4">
              <div>
                <h4 className="font-black text-sm uppercase font-mono tracking-wider text-slate-400">
                  Panel Aksi Planner
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Ingin mengubah sasaran atau memproses ulang dari awal data transaksi Anda?
                </p>
              </div>
              <Button
                onClick={handleDeletePlan}
                disabled={isPending}
                variant="outline"
                className="w-full h-11 text-xs font-bold border-2 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <LucideIcons.Trash2 className="h-4 w-4" />
                Hapus & Buat Ulang Rencana AI
              </Button>
            </div>

            {/* Current Wallets Summary in Sidebar */}
            <div className="bg-[#f3c9b6] text-black border-2 border-black p-5 rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)] space-y-4">
              <div>
                <span className="text-[9px] font-bold font-mono text-orange-950 uppercase tracking-widest block">
                  Status Saldo Dompet
                </span>
                <h4 className="text-xl font-black text-black mt-1">
                  {formatRupiah(totalBalance)}
                </h4>
              </div>
              
              <div className="space-y-2 border-t border-black/10 pt-3 max-h-[220px] overflow-y-auto pr-1">
                {initialWallets.map((w, idx) => (
                  <div
                    key={w.id}
                    className="flex justify-between items-center bg-white/40 p-2 rounded-xl border border-black/5"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0" style={{ backgroundColor: getPastelColor(w.color, idx) }}>
                        {w.icon || '💳'}
                      </span>
                      <span className="font-bold text-xs truncate max-w-[100px]">
                        {w.name}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-xs">
                      {formatRupiah(w.balance)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Educational tips */}
            <div className="bg-[#dceeb1] text-black border-2 border-black p-5 rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)] space-y-2">
              <h4 className="font-black text-xs uppercase font-mono tracking-wider text-lime-950 flex items-center gap-1">
                <LucideIcons.Info className="h-4 w-4" />
                Aturan Menabung Pintar
              </h4>
              <p className="text-[11px] font-medium leading-relaxed opacity-90">
                Gunakan konsep <strong>50/30/20</strong>: Alokasikan 50% pendapatan untuk kebutuhan pokok, 30% untuk keinginan, dan minimal 20% langsung ditabung atau diinvestasikan ke instrumen berpendapatan tetap (seperti Jago Kantong Terkunci atau SBN) sebelum Anda mulai berbelanja di awal bulan.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
