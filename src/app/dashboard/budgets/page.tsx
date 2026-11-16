import { getBudgets } from '@/actions/budgets'
import { BudgetsClient } from '@/components/dashboard/BudgetsClient'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCachedAIBudgetPlan, AIBudgetPlanResult } from '@/actions/ai-budget'

interface PageProps {
  searchParams: Promise<{
    month?: string
    year?: string
  }>
}

export default async function BudgetsPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { month: monthParam, year: yearParam } = await searchParams
  const now = new Date()
  const month = monthParam ? parseInt(monthParam) : now.getMonth() + 1
  const year = yearParam ? parseInt(yearParam) : now.getFullYear()

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

