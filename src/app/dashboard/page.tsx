import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  TrendingUp,
  Plus,
  History
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'

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

  // MOCK DATA for visualization
  const stats = [
    { label: 'Total Saldo', value: 'Rp 0', icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Pemasukan', value: 'Rp 0', icon: ArrowUpRight, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Pengeluaran', value: 'Rp 0', icon: ArrowDownLeft, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20' },
    { label: 'Tabungan', value: '0%', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  ]

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight dark:text-white">Ringkasan Keuangan</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Halo {profile?.full_name?.split(' ')[0] || user.user_metadata?.full_name?.split(' ')[0] || 'User'}, inilah kondisi keuangan kamu bulan ini.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TransactionForm />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                  <h3 className="text-2xl font-bold mt-1 dark:text-white">{stat.value}</h3>
                </div>
                <div className={`${stat.bg} p-3 rounded-xl`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section (Placeholder) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold dark:text-white">Tren Pengeluaran</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
              <div className="text-center">
                <PieChart className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Grafik akan muncul setelah kamu memiliki transaksi.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold dark:text-white">Transaksi Terakhir</CardTitle>
            <History className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <RecentTransactions />
            </div>
            <Button variant="ghost" className="w-full text-slate-500 mt-4 text-sm">
              Lihat Semua
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Tips or AI Insights */}
      <div className="bg-emerald-600 rounded-2xl p-6 text-white overflow-hidden relative">
        <div className="relative z-10">
          <h3 className="text-xl font-bold mb-2">Tips Hemat Hari Ini</h3>
          <p className="text-emerald-100 max-w-2xl">
            "Jangan menabung apa yang tersisa setelah dibelanjakan, tetapi belanjakanlah apa yang tersisa setelah menabung." 
            - Warren Buffett
          </p>
        </div>
        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -left-8 -top-8 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl"></div>
      </div>
    </div>
  )
}

function PieChart(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  )
}
