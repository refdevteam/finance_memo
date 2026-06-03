import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TransactionListClient } from '@/components/transactions/TransactionListClient'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: { type?: string; wallet?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const typeFilter = searchParams.type
  const walletFilter = searchParams.wallet

  // 1. Fetch Wallets untuk opsi filter di client
  const { data: wallets } = await supabase
    .from('wallets')
    .select('id, name')
    .eq('user_id', user.id)
    .order('name')

  // 2. Fetch Transactions berdasarkan filter
  let query = supabase
    .from('transactions')
    .select(`
      id,
      amount,
      type,
      description,
      transaction_date,
      created_at,
      wallet_id,
      category_id,
      categories (
        name,
        icon,
        color,
        type
      ),
      wallets (
        name
      )
    `)
    .eq('user_id', user.id)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (typeFilter && typeFilter !== 'all') {
    query = query.eq('type', typeFilter)
  }

  if (walletFilter && walletFilter !== 'all') {
    query = query.eq('wallet_id', walletFilter)
  }

  const { data: transactions, error } = await query

  if (error) {
    console.error('Error fetching transactions:', error)
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight dark:text-white">Daftar Transaksi</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Kelola seluruh riwayat transaksi pemasukan, pengeluaran, dan transfer Anda.
        </p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-border">
        <Link 
          href="/dashboard/transactions" 
          className="px-4 py-2.5 border-b-2 font-semibold text-sm transition-all border-primary text-foreground"
        >
          Riwayat
        </Link>
        <Link 
          href="/dashboard/transactions/recurring" 
          className="px-4 py-2.5 border-b-2 font-medium text-sm transition-all border-transparent text-muted-foreground hover:text-foreground"
        >
          Rencana Berulang
        </Link>
      </div>

      <TransactionListClient 
        transactions={transactions || []} 
        wallets={wallets || []} 
      />
    </div>
  )
}
