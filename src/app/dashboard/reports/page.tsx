import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReportsClient } from '@/components/reports/ReportsClient'

export const dynamic = 'force-dynamic'

function toLocalYYYYMMDD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

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
    startDateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
    const lastDay = new Date(selectedYear, selectedMonth, 0)
    endDateStr = toLocalYYYYMMDD(lastDay)
  } else {
    // 30 days ago from today (inclusive)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(now.getDate() - 29)
    startDateStr = toLocalYYYYMMDD(thirtyDaysAgo)
    endDateStr = toLocalYYYYMMDD(now)
  }

  // Tentukan rentang waktu 6 bulan terakhir dari bulan yang dipilih
  let startMonth = selectedMonth - 6
  let startYear = selectedYear
  while (startMonth <= 0) {
    startMonth += 12
    startYear -= 1
  }
  const startOfSixMonthsAgo = `${startYear}-${String(startMonth).padStart(2, '0')}-01`

  // --- QUERIES ---

  // 1. Ambil daftar dompet untuk filter
  const { data: wallets } = await supabase
    .from('wallets')
    .select('id, name, is_event_wallet')
    .eq('user_id', user.id)
    .order('name')

  const eventWalletIds = (wallets || [])
    .filter(w => w.is_event_wallet)
    .map(w => w.id)

  // 2. Ambil transaksi (untuk summary dan pie chart)
  let monthQuery = supabase
    .from('transactions')
    .select('amount, type, transaction_date, wallet_id, description, category_id, categories(name, color)')
    .eq('user_id', user.id)
    .gte('transaction_date', startDateStr)
    .lte('transaction_date', endDateStr)

  if (selectedWallet) {
    monthQuery = monthQuery.eq('wallet_id', selectedWallet)
  } else if (eventWalletIds.length > 0) {
    // Saring agar dompet event tidak merusak laporan utama bulanan
    monthQuery = monthQuery.not('wallet_id', 'in', `(${eventWalletIds.join(',')})`)
  }

  const { data: monthTransactions } = await monthQuery

  // 3. Ambil transaksi 6 bulan (untuk trend bar chart)
  let sixMonthQuery = supabase
    .from('transactions')
    .select('amount, type, transaction_date, wallet_id')
    .eq('user_id', user.id)
    .gte('transaction_date', startOfSixMonthsAgo)
    .lte('transaction_date', endDateStr)

  if (selectedWallet) {
    sixMonthQuery = sixMonthQuery.eq('wallet_id', selectedWallet)
  } else if (eventWalletIds.length > 0) {
    sixMonthQuery = sixMonthQuery.not('wallet_id', 'in', `(${eventWalletIds.join(',')})`)
  }

  const { data: sixMonthTransactions } = await sixMonthQuery

  // 4. Ambil transaksi dompet event secara khusus
  let eventTransactions: any[] = []
  if (eventWalletIds.length > 0) {
    const { data: evTrxs } = await supabase
      .from('transactions')
      .select('amount, type, transaction_date, wallet_id, description, category_id, categories(name, color)')
      .eq('user_id', user.id)
      .in('wallet_id', eventWalletIds)
      .gte('transaction_date', startDateStr)
      .lte('transaction_date', endDateStr)
    eventTransactions = evTrxs || []
  }

  return (
    <div className="p-4 md:p-8">
      <ReportsClient 
        wallets={wallets || []}
        monthTransactions={monthTransactions || []}
        sixMonthTransactions={sixMonthTransactions || []}
        eventTransactions={eventTransactions}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        selectedWallet={selectedWallet}
        range={range}
        startDateStr={startDateStr}
        endDateStr={endDateStr}
      />
    </div>
  )
}
