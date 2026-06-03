import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
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
import { SpendingTrendChart, CategoryPieChart } from '@/components/dashboard/DashboardCharts'

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

export default async function DashboardPage() {
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

  // Get current month range
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  // Fetch all data in parallel
  const [walletsRes, incomeRes, expenseRes, dailyTransactionsRes, categoryExpensesRes, categoriesRes] = await Promise.all([
    // Total balance from all active wallets
    supabase
      .from('wallets')
      .select('id, name, balance')
      .eq('user_id', user.id)
      .eq('is_active', true),
    
    // Total income this month
    supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('type', 'income')
      .gte('transaction_date', startOfMonth)
      .lte('transaction_date', endOfMonth),
    
    // Total expenses this month
    supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('transaction_date', startOfMonth)
      .lte('transaction_date', endOfMonth),

    // Daily transactions for trend chart (this month)
    supabase
      .from('transactions')
      .select('amount, type, transaction_date')
      .eq('user_id', user.id)
      .gte('transaction_date', startOfMonth)
      .lte('transaction_date', endOfMonth)
      .order('transaction_date', { ascending: true }),

    // Expenses by category for pie chart (this month)
    supabase
      .from('transactions')
      .select('amount, category_id, categories(name, color)')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('transaction_date', startOfMonth)
      .lte('transaction_date', endOfMonth),
      
    // Fetch all categories for Receipt Scanner
    supabase
      .from('categories')
      .select('id, name, type')
      .or(`user_id.eq.${user.id},user_id.is.null`),
  ])

  // Stats calculations
  const totalBalance = walletsRes.data?.reduce((sum, w) => sum + Number(w.balance || 0), 0) ?? 0
  const totalIncome = incomeRes.data?.reduce((sum, t) => sum + Number(t.amount || 0), 0) ?? 0
  const totalExpense = expenseRes.data?.reduce((sum, t) => sum + Number(t.amount || 0), 0) ?? 0
  const savingsRate = totalIncome > 0 
    ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) 
    : 0

  // Build daily trend data
  const dailyMap = new Map<string, { income: number; expense: number }>()
  
  // Initialize all days in month
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    dailyMap.set(dateStr, { income: 0, expense: 0 })
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
    { label: 'Total Saldo', value: formatRupiah(totalBalance), icon: Wallet, bgClass: 'bg-[#dceeb1] dark:bg-slate-900 text-black dark:text-white' },
    { label: 'Pemasukan', value: formatRupiah(totalIncome), icon: ArrowUpRight, bgClass: 'bg-[#c8e6cd] dark:bg-slate-900 text-black dark:text-white' },
    { label: 'Pengeluaran', value: formatRupiah(totalExpense), icon: ArrowDownLeft, bgClass: 'bg-[#efd4d4] dark:bg-slate-900 text-black dark:text-white' },
    { label: 'Rasio Tabungan', value: `${savingsRate}%`, icon: TrendingUp, bgClass: 'bg-[#f4ecd6] dark:bg-slate-900 text-black dark:text-white' },
  ]

  // Month name for header
  const monthName = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 pb-28 md:pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight dark:text-white">Ringkasan Keuangan</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Halo {profile?.full_name?.split(' ')[0] || user.user_metadata?.full_name?.split(' ')[0] || 'User'}, inilah kondisi keuangan kamu bulan ini.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 flex-wrap">
          <ReceiptScanner wallets={walletsRes.data || []} categories={categoriesRes.data || []} />
          <TransferForm />
          <TransactionForm />
        </div>
      </div>

      {/* Stats Grid - Figma Color Blocks (Compact 2-Cols on Mobile) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat) => (
          <div 
            key={stat.label} 
            className={cn(
              "p-3.5 sm:p-6 rounded-lg border border-transparent dark:border-slate-800 flex flex-col justify-between min-h-[85px] sm:min-h-[110px] transition-all hover:scale-[1.01] shadow-none",
              stat.bgClass
            )}
          >
            <div className="flex items-center justify-between w-full gap-1">
              <div className="min-w-0 flex-1">
                <p className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-widest opacity-60 truncate">{stat.label}</p>
                <h3 className="text-base sm:text-2xl font-extrabold sm:font-bold mt-1 sm:mt-2 tracking-tight truncate">{stat.value}</h3>
              </div>
              <div className="bg-black text-white dark:bg-white dark:text-black p-1.5 sm:p-3 rounded-full flex items-center justify-center shrink-0 shadow-sm">
                <stat.icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Spending Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold dark:text-white">
              Tren Keuangan — {monthName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SpendingTrendChart data={dailyChartData} />
          </CardContent>
        </Card>

        {/* Category Breakdown Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold dark:text-white">Pengeluaran per Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryPieChart data={categoryChartData} />
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

        {/* Quick Tips - Figma Lilac/Navy Block */}
        <div className="bg-[#c5b0f4] dark:bg-[#1f1d3d] rounded-lg p-6 text-black dark:text-white relative h-fit">
          <div className="relative z-10">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-black/60 dark:text-white/60 mb-2">Tips Harian</p>
            <h3 className="text-xl font-bold mb-3">Tips Hemat Hari Ini</h3>
            <p className="text-black/80 dark:text-white/80 text-sm leading-relaxed">
              &quot;Jangan menabung apa yang tersisa setelah dibelanjakan, tetapi belanjakanlah apa yang tersisa setelah menabung.&quot; 
              — Warren Buffett
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
