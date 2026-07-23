import { getBudgets } from '@/actions/budgets'
import { BudgetsClient } from '@/components/dashboard/BudgetsClient'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCachedAIBudgetPlan, AIBudgetPlanResult } from '@/actions/ai-budget'

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
  
  // Get AI Budget plan
  const aiPlanRes = await getCachedAIBudgetPlan().catch((): AIBudgetPlanResult => ({ success: false }))

  return (
    <BudgetsClient 
      initialBudgets={budgets} 
      initialCachedPlan={aiPlanRes?.success ? aiPlanRes.data || null : null}
      month={month} 
      year={year} 
    />
  )
}

