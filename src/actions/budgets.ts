'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { syncAICacheWithBudgets } from './ai-budget'

export interface BudgetCategory {
  category_id: string
  category_name: string
  category_icon: string
  category_color: string
  budget_id: string | null
  budget_limit: number
  budget_notes: string | null
  spent: number
}

/**
 * Fetch all expense categories with budget limits and aggregated spent amounts for a specific month & year.
 */
export async function getBudgets(month: number, year: number): Promise<BudgetCategory[]> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    // Get current month range
    const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endOfMonth = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    // Fetch in parallel:
    // 1. All expense categories
    // 2. All budgets set for this month
    // 3. All expense transactions in this month
    const [categoriesRes, budgetsRes, transactionsRes] = await Promise.all([
      supabase
        .from('categories')
        .select('*')
        .eq('type', 'expense')
        .or(`user_id.eq.${user.id},user_id.is.null`),
      supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', month)
        .eq('year', year),
      supabase
        .from('transactions')
        .select('category_id, amount')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('transaction_date', startOfMonth)
        .lte('transaction_date', endOfMonth)
    ])

    if (categoriesRes.error) throw categoriesRes.error
    if (budgetsRes.error) throw budgetsRes.error
    if (transactionsRes.error) throw transactionsRes.error

    const categories = categoriesRes.data || []
    const budgets = budgetsRes.data || []
    const transactions = transactionsRes.data || []

    // Map transaction spending by category
    const spendingMap = new Map<string, number>()
    transactions.forEach((tx) => {
      if (tx.category_id) {
        const current = spendingMap.get(tx.category_id) || 0
        spendingMap.set(tx.category_id, current + Number(tx.amount || 0))
      }
    })

    // Map budget settings by category
    const budgetMap = new Map<string, { id: string; amount: number; notes: string | null }>()
    budgets.forEach((b) => {
      budgetMap.set(b.category_id, {
        id: b.id,
        amount: Number(b.amount || 0),
        notes: b.notes
      })
    })

    // Merge everything into a list of BudgetCategory
    const result: BudgetCategory[] = categories.map((cat) => {
      const budget = budgetMap.get(cat.id)
      return {
        category_id: cat.id,
        category_name: cat.name,
        category_icon: cat.icon || 'Tag',
        category_color: cat.color || '#94a3b8',
        budget_id: budget?.id || null,
        budget_limit: budget?.amount || 0,
        budget_notes: budget?.notes || null,
        spent: spendingMap.get(cat.id) || 0
      }
    })

    // Sort: categories with active budget limit first, then alphabetically
    return result.sort((a, b) => {
      if (a.budget_limit > 0 && b.budget_limit === 0) return -1
      if (a.budget_limit === 0 && b.budget_limit > 0) return 1
      return a.category_name.localeCompare(b.category_name)
    })

  } catch (error) {
    console.error('Error in getBudgets server action:', error)
    throw error
  }
}

/**
 * Upsert or delete a budget limit for a category.
 * If amount is 0 or less, the budget is deleted.
 */
export async function setBudget(
  categoryId: string,
  amount: number,
  month: number,
  year: number,
  notes?: string
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Kamu harus login terlebih dahulu.' }
    }

    if (amount <= 0) {
      // If amount is 0, delete the budget
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('user_id', user.id)
        .eq('category_id', categoryId)
        .eq('month', month)
        .eq('year', year)

      if (error) throw error
    } else {
      // Upsert budget
      const { error } = await supabase
        .from('budgets')
        .upsert({
          user_id: user.id,
          category_id: categoryId,
          amount,
          month,
          year,
          notes: notes || null
        }, {
          onConflict: 'user_id,category_id,month,year'
        })

      if (error) throw error
    }

    // Sync the manual edit with AI Cache so the dashboard plan doesn't become stale
    await syncAICacheWithBudgets(user.id, [{
      categoryId,
      limitAmount: amount,
      // We don't have the category name here easily, but the sync function handles it if it's updating an existing one.
    }])

    revalidatePath('/dashboard/budgets')
    revalidatePath('/dashboard')
    
    return { success: true }
  } catch (error) {
    console.error('Error setting budget:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Gagal mengatur anggaran.' }
  }
}

/**
 * Copy budgets from the previous month to the current month.
 */
export async function copyBudgetsFromPreviousMonth(month: number, year: number) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Kamu harus login terlebih dahulu.' }
    }

    // Determine previous month and year
    let prevMonth = month - 1
    let prevYear = year
    if (prevMonth === 0) {
      prevMonth = 12
      prevYear = year - 1
    }

    // Fetch previous month's budgets
    const { data: prevBudgets, error: fetchError } = await supabase
      .from('budgets')
      .select('category_id, amount, notes')
      .eq('user_id', user.id)
      .eq('month', prevMonth)
      .eq('year', prevYear)

    if (fetchError) throw fetchError

    if (!prevBudgets || prevBudgets.length === 0) {
      return { success: false, error: 'Tidak ditemukan data anggaran pada bulan sebelumnya.' }
    }

    // Map to new insert structure
    const newBudgets = prevBudgets.map((b) => ({
      user_id: user.id,
      category_id: b.category_id,
      amount: b.amount,
      month: month,
      year: year,
      notes: b.notes
    }))

    // Batch upsert
    const { error: upsertError } = await supabase
      .from('budgets')
      .upsert(newBudgets, {
        onConflict: 'user_id,category_id,month,year'
      })

    if (upsertError) throw upsertError

    revalidatePath('/dashboard/budgets')
    revalidatePath('/dashboard')

    return { success: true, count: newBudgets.length }
  } catch (error) {
    console.error('Error copying budgets:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Gagal menyalin anggaran.' }
  }
}
