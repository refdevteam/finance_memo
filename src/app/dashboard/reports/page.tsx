import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReportsClient } from '@/components/reports/ReportsClient'

export const dynamic = 'force-dynamic'

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { month?: string; year?: string; wallet?: string; range?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const now = new Date()
  const range = searchParams.range || '30days'
  const isMonth = range === 'month'

  const selectedMonth = parseInt(searchParams.month || String(now.getMonth() + 1))
  const selectedYear = parseInt(searchParams.year || String(now.getFullYear()))
  const selectedWallet = searchParams.wallet && searchParams.wallet !== 'all' ? searchParams.wallet : null

  // Tentukan rentang waktu untuk bulan yang dipilih atau 30 hari terakhir
  let startDateStr: string
  let endDateStr: string

  if (isMonth) {
    startDateStr = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split('T')[0]
    endDateStr = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0]
  } else {
    // 30 days ago from today (inclusive)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(now.getDate() - 29)
    startDateStr = thirtyDaysAgo.toISOString().split('T')[0]
    endDateStr = now.toISOString().split('T')[0]
  }

  // Tentukan rentang waktu 6 bulan terakhir dari bulan yang dipilih
  const startOfSixMonthsAgo = new Date(selectedYear, selectedMonth - 6, 1).toISOString().split('T')[0]

  // --- QUERIES ---

  // 1. Ambil daftar dompet untuk filter
  const { data: wallets } = await supabase
    .from('wallets')
    .select('id, name')
    .eq('user_id', user.id)
    .order('name')

  // 2. Ambil transaksi (untuk summary dan pie chart)
  let monthQuery = supabase
    .from('transactions')
    .select('amount, type, category_id, categories(name, color)')
    .eq('user_id', user.id)
    .gte('transaction_date', startDateStr)
    .lte('transaction_date', endDateStr)

  if (selectedWallet) {
    monthQuery = monthQuery.eq('wallet_id', selectedWallet)
  }

  const { data: monthTransactions } = await monthQuery

  // 3. Ambil transaksi 6 bulan (untuk trend bar chart)
  let sixMonthQuery = supabase
    .from('transactions')
    .select('amount, type, transaction_date')
    .eq('user_id', user.id)
    .gte('transaction_date', startOfSixMonthsAgo)
    .lte('transaction_date', endDateStr)

  if (selectedWallet) {
    sixMonthQuery = sixMonthQuery.eq('wallet_id', selectedWallet)
  }

  const { data: sixMonthTransactions } = await sixMonthQuery

  return (
    <div className="p-4 md:p-8">
      <ReportsClient 
        wallets={wallets || []}
        monthTransactions={monthTransactions || []}
        sixMonthTransactions={sixMonthTransactions || []}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        selectedWallet={selectedWallet}
        range={range}
      />
    </div>
  )
}
