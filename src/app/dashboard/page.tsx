import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  TrendingUp,
  History
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { TransferForm } from '@/components/transactions/TransferForm'
import { ReceiptScanner } from '@/components/transactions/ReceiptScanner'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { SpendingTrendChart, CategoryBarChart } from '@/components/dashboard/DashboardCharts'
import { getPastelColor } from '@/lib/colors'
import { getBudgets } from '@/actions/budgets'
import { getCachedAIBudgetPlan, AIBudgetPlanResult } from '@/actions/ai-budget'
import { BudgetProgress } from '@/components/dashboard/BudgetProgress'
import { DashboardRangeToggle } from '@/components/dashboard/DashboardRangeToggle'
import { AICoachCard } from '@/components/dashboard/AICoachCard'
import { DashboardWidgetsMobile } from '@/components/dashboard/DashboardWidgetsMobile'
import { UpcomingReminders } from '@/components/dashboard/UpcomingReminders'
import { FimoAITrigger } from '@/components/dashboard/FimoAITrigger'
import { MobileChartsTabs } from '@/components/dashboard/MobileChartsTabs'

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function toLocalYYYYMMDD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { range?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile && !profile.onboarded) {
    redirect('/dashboard/onboarding')
  }

  // Get date range based on search parameter (default is '30days')
  const range = searchParams?.range || '30days'
  const isMonth = range === 'month'
  const now = new Date()
  
  let startDateStr: string
  let endDateStr: string
  
  if (isMonth) {
    startDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    endDateStr = toLocalYYYYMMDD(lastDay)
  } else {
    // 30 days ago from today (inclusive)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(now.getDate() - 29)
    startDateStr = toLocalYYYYMMDD(thirtyDaysAgo)
    endDateStr = toLocalYYYYMMDD(now)
  }

  const sevenDaysLater = new Date()
  sevenDaysLater.setDate(now.getDate() + 7)
  const sevenDaysLaterStr = toLocalYYYYMMDD(sevenDaysLater)

  // Fetch all data in parallel
  const [walletsRes, incomeRes, expenseRes, dailyTransactionsRes, categoryExpensesRes, categoriesRes, remindersRes, aiPlanRes] = await Promise.all([
    // Total balance from all active wallets
    supabase
      .from('wallets')
      .select('id, name, balance')
      .eq('user_id', user.id)
      .eq('is_active', true),
    
    // Total income this month or in 30 days
    supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('type', 'income')
      .gte('transaction_date', startDateStr)
      .lte('transaction_date', endDateStr),
    
    // Total expenses this month or in 30 days
    supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('transaction_date', startDateStr)
      .lte('transaction_date', endDateStr),

    // Daily transactions for trend chart
    supabase
      .from('transactions')
      .select('amount, type, transaction_date')
      .eq('user_id', user.id)
      .gte('transaction_date', startDateStr)
      .lte('transaction_date', endDateStr)
      .order('transaction_date', { ascending: true }),

    // Expenses by category for pie chart
    supabase
      .from('transactions')
      .select('amount, category_id, categories(name, color)')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('transaction_date', startDateStr)
      .lte('transaction_date', endDateStr),
      
    // Fetch all categories for Receipt Scanner
    supabase
      .from('categories')
      .select('id, name, type')
      .or(`user_id.eq.${user.id},user_id.is.null`),

    // Fetch active reminders count due up to 7 days from now (including overdue)
    supabase
      .from('reminders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)
      .lte('due_date', sevenDaysLaterStr),

    // Cached AI Budget Plan
    getCachedAIBudgetPlan().catch((): AIBudgetPlanResult => ({ success: false }))
  ])

  const budgets = await getBudgets(now.getMonth() + 1, now.getFullYear())
  const upcomingRemindersCount = remindersRes.count ?? 0

  // Stats calculations
  const totalBalance = walletsRes.data?.reduce((sum, w) => sum + Number(w.balance || 0), 0) ?? 0
  const totalIncome = incomeRes.data?.reduce((sum, t) => sum + Number(t.amount || 0), 0) ?? 0
  const totalExpense = expenseRes.data?.reduce((sum, t) => sum + Number(t.amount || 0), 0) ?? 0
  const savingsRate = totalIncome > 0 
    ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) 
    : 0

  // Build daily trend data
  const dailyMap = new Map<string, { income: number; expense: number }>()
  
  if (isMonth) {
    // Initialize all days in month
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      dailyMap.set(dateStr, { income: 0, expense: 0 })
    }
  } else {
    // Initialize all 30 days
    for (let i = 0; i < 30; i++) {
      const d = new Date()
      d.setDate(now.getDate() - (29 - i))
      const dateStr = toLocalYYYYMMDD(d)
      dailyMap.set(dateStr, { income: 0, expense: 0 })
    }
  }
  
  // Fill with actual data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dailyTransactionsRes.data?.forEach((t: any) => {
    const existing = dailyMap.get(t.transaction_date) || { income: 0, expense: 0 }
    const amount = Number(t.amount || 0)
    if (t.type === 'income') existing.income += amount
    if (t.type === 'expense') existing.expense += amount
    dailyMap.set(t.transaction_date, existing)
  })

  const dailyChartData = Array.from(dailyMap.entries()).map(([date, vals]) => ({
    date: formatShortDate(date),
    income: vals.income,
    expense: vals.expense,
  }))

  // Build category pie data
  const categoryMap = new Map<string, { name: string; value: number; color: string }>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  categoryExpensesRes.data?.forEach((t: any) => {
    const catName = t.categories?.name || 'Lainnya'
    const catColor = t.categories?.color || '#94a3b8'
    const existing = categoryMap.get(catName) || { name: catName, value: 0, color: catColor }
    existing.value += Number(t.amount || 0)
    categoryMap.set(catName, existing)
  })
  const categoryChartData = Array.from(categoryMap.values())
    .sort((a, b) => b.value - a.value)

  const stats = [
    { label: 'Total Saldo', value: formatRupiah(totalBalance), icon: Wallet, bgClass: 'bg-[#dceeb1] text-black' },
    { label: 'Pemasukan', value: formatRupiah(totalIncome), icon: ArrowUpRight, bgClass: 'bg-[#c8e6cd] text-black' },
    { label: 'Pengeluaran', value: formatRupiah(totalExpense), icon: ArrowDownLeft, bgClass: 'bg-[#efd4d4] text-black' },
    { label: 'Rasio Tabungan', value: `${savingsRate}%`, icon: TrendingUp, bgClass: 'bg-[#f4ecd6] text-black' },
  ]

  // Month name for header
  const monthName = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  const chartTitleLabel = isMonth ? monthName : '30 Hari Terakhir'

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 pb-28 md:pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight dark:text-white">Ringkasan Keuangan</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Halo {profile?.full_name?.split(' ')[0] || user.user_metadata?.full_name?.split(' ')[0] || 'User'}, inilah kondisi keuangan kamu {isMonth ? 'bulan ini' : '30 hari terakhir'}.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-nowrap">
            <DashboardRangeToggle />
            <FimoAITrigger />
          </div>
          <div className="hidden md:flex items-center gap-2 flex-wrap">
            <ReceiptScanner wallets={walletsRes.data || []} categories={categoriesRes.data || []} />
            <TransferForm />
            <TransactionForm />
          </div>
        </div>
      </div>

      {/* Fimo AI Highlight Section Card (Visible on both Mobile & Desktop) */}
      <div className="w-full">
        <AICoachCard 
          aiPlan={aiPlanRes?.success ? aiPlanRes.data || null : null} 
          totalBudgeted={budgets.reduce((sum, b) => sum + b.budget_limit, 0)}
        />
      </div>

      {/* Stats Grid - Figma Color Blocks (Compact 2-Cols on Mobile) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat) => (
          <div 
            key={stat.label} 
            className={cn(
              "p-3.5 sm:p-6 rounded-xl border-2 border-black dark:border-white flex flex-col justify-between min-h-[85px] sm:min-h-[110px] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_rgba(255,255,255,0.15)] shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] duration-200",
              stat.bgClass
            )}
          >
            <div className="flex items-center justify-between w-full gap-1">
              <div className="min-w-0 flex-1">
                <p className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-widest opacity-60 truncate">{stat.label}</p>
                <h3 className="text-base sm:text-2xl font-extrabold sm:font-bold mt-1 sm:mt-2 tracking-tight truncate">{stat.value}</h3>
              </div>
              <div className="bg-black text-white p-1.5 sm:p-3 rounded-full flex items-center justify-center shrink-0 shadow-sm">
                <stat.icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile-only widgets grid */}
      <DashboardWidgetsMobile
        budgets={budgets}
        upcomingRemindersCount={upcomingRemindersCount}
      />

      {/* Mobile-only Interactive Charts Selector (Tren vs Kategori) */}
      <MobileChartsTabs 
        dailyChartData={dailyChartData}
        categoryChartData={categoryChartData}
        savingsRate={savingsRate}
        chartTitleLabel={chartTitleLabel}
      />

      {/* Desktop-only Charts Grid */}
      <div className="hidden md:grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Spending Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold dark:text-white">
              Tren Keuangan — {chartTitleLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SpendingTrendChart data={dailyChartData} />
          </CardContent>
        </Card>

        {/* Category Breakdown Bar */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg font-semibold dark:text-white">Pengeluaran per Kategori</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between">
            <div className="flex-1 flex items-center justify-center min-h-[200px]">
              <CategoryBarChart data={categoryChartData} height={200} />
            </div>
            
            {/* Legenda Baru: Keterangan Warna & Amount */}
            <div className="mt-4 space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
              {categoryChartData.map((c, idx) => (
                <div key={c.name} className="flex items-center justify-between text-xs p-1.5 px-2.5 rounded-2xl bg-white/40 dark:bg-black/10 border border-slate-100/50 dark:border-slate-800/50 hover:bg-white dark:hover:bg-neutral-800/80 transition-all duration-200 shadow-3xs">
                  <div className="flex items-center min-w-0 flex-1">
                    <span className="w-2.5 h-2.5 rounded-full mr-2 shrink-0 border border-black/5 dark:border-white/5" style={{ backgroundColor: getPastelColor(c.color, idx) }} />
                    <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">{c.name}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-100 ml-2 shrink-0">
                    {formatRupiah(c.value)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Transactions */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold dark:text-white">Transaksi Terakhir</CardTitle>
            <History className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <RecentTransactions />
            </div>
            <Link href="/dashboard/transactions" className="w-full block">
              <Button variant="ghost" className="w-full text-slate-500 mt-4 text-sm">
                Lihat Semua
              </Button>
            </Link>
          </CardContent>
        </Card>
        {/* Right side container for Budget (Desktop only) */}
        <div className="hidden md:block space-y-8 h-fit">
          {/* Upcoming Reminders Card */}
          <Card>
            <CardContent className="pt-6">
              <UpcomingReminders />
            </CardContent>
          </Card>

          {/* Anggaran Bulanan Card */}
          <Card className="border-2 border-black dark:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] rounded-2xl bg-white dark:bg-zinc-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-extrabold dark:text-white">Anggaran Kategori</CardTitle>
            </CardHeader>
            <CardContent>
              <BudgetProgress budgets={budgets} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
