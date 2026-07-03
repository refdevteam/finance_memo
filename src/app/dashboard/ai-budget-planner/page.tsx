import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCachedAIBudgetPlan, AIBudgetPlanResult } from '@/actions/ai-budget'
import { getBudgets } from '@/actions/budgets'
import { getWallets } from '@/actions/wallets'
import { getCategories } from '@/actions/categories'
import { AIBudgetPlannerClient } from '@/components/dashboard/AIBudgetPlannerClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'AI Budget Planner | Fimo',
  description: 'Rencanakan pembagian anggaran bulanan dan target menabung cerdas bersama asisten AI Fimo.',
}

export default async function AIBudgetPlannerPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  // Load initial data in parallel
  const [wallets, categories, budgets, cachedPlanRes] = await Promise.all([
    getWallets().catch(() => []),
    getCategories().catch(() => []),
    getBudgets(currentMonth, currentYear).catch(() => []),
    getCachedAIBudgetPlan().catch((): AIBudgetPlanResult => ({ success: false }))
  ])

  // Get total income for the current month
  const startOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
  const lastDay = new Date(currentYear, currentMonth, 0).getDate()
  const endOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data: incomeData } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', user.id)
    .eq('type', 'income')
    .gte('transaction_date', startOfMonth)
    .lte('transaction_date', endOfMonth)

  const totalIncome = incomeData?.reduce((sum, t) => sum + Number(t.amount || 0), 0) ?? 0

  return (
    <AIBudgetPlannerClient
      initialWallets={wallets}
      initialCategories={categories}
      initialBudgets={budgets}
      initialCachedPlan={cachedPlanRes.success && cachedPlanRes.data ? cachedPlanRes.data : null}
      currentMonth={currentMonth}
      currentYear={currentYear}
      totalIncome={totalIncome}
    />
  )
}
