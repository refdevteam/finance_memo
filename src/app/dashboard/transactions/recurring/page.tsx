import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getRecurringTemplates } from '@/actions/recurring'
import { RecurringListClient, RecurringTemplate } from '@/components/transactions/RecurringListClient'

export const dynamic = 'force-dynamic'

export default async function RecurringTransactionsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  let templates: RecurringTemplate[] = []
  try {
    templates = (await getRecurringTemplates()) as unknown as RecurringTemplate[]
  } catch (error) {
    console.error('Error in RecurringTransactionsPage:', error)
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
          className="px-4 py-2.5 border-b-2 font-medium text-sm transition-all border-transparent text-muted-foreground hover:text-foreground"
        >
          Riwayat
        </Link>
        <Link 
          href="/dashboard/transactions/recurring" 
          className="px-4 py-2.5 border-b-2 font-semibold text-sm transition-all border-primary text-foreground"
        >
          Rencana Berulang
        </Link>
      </div>

      <RecurringListClient templates={templates} />
    </div>
  )
}
