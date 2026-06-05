import { getBudgets } from '@/actions/budgets'
import { BudgetsClient } from '@/components/dashboard/BudgetsClient'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface PageProps {
  searchParams: {
    month?: string
    year?: string
  }
}

export default async function BudgetsPage({ searchParams }: PageProps) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const now = new Date()
  const month = searchParams.month ? parseInt(searchParams.month) : now.getMonth() + 1
  const year = searchParams.year ? parseInt(searchParams.year) : now.getFullYear()

  // Retrieve budgets data (includes category info and current month expenses spent)
  const budgets = await getBudgets(month, year)

  return (
    <BudgetsClient 
      initialBudgets={budgets} 
      month={month} 
      year={year} 
    />
  )
}
