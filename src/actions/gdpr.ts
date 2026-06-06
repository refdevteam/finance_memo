'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function exportUserData() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { success: false, error: 'Unauthorized' }
  
  try {
    const [
      profileRes,
      walletsRes,
      categoriesRes,
      transactionsRes,
      budgetsRes,
      recurringRes,
      remindersRes,
      notificationsRes,
      receiptsRes
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('wallets').select('*').eq('user_id', user.id),
      supabase.from('categories').select('*').eq('user_id', user.id),
      supabase.from('transactions').select('*').eq('user_id', user.id),
      supabase.from('budgets').select('*').eq('user_id', user.id),
      supabase.from('recurring_templates').select('*').eq('user_id', user.id),
      supabase.from('reminders').select('*').eq('user_id', user.id),
      supabase.from('notifications').select('*').eq('user_id', user.id),
      supabase.from('receipts').select('*').eq('user_id', user.id)
    ])
    
    const exportData = {
      exported_at: new Date().toISOString(),
      user_id: user.id,
      email: user.email,
      profile: profileRes.data || null,
      wallets: walletsRes.data || [],
      categories: categoriesRes.data || [],
      transactions: transactionsRes.data || [],
      budgets: budgetsRes.data || [],
      recurring_templates: recurringRes.data || [],
      reminders: remindersRes.data || [],
      notifications: notificationsRes.data || [],
      receipts: receiptsRes.data || []
    }
    
    return { success: true, data: exportData }
  } catch (error) {
    console.error('GDPR Export Error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Gagal mengekspor data' }
  }
}

export async function deleteUserAccount() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { success: false, error: 'Unauthorized' }
  
  try {
    // Delete all related records
    await supabase.from('notifications').delete().eq('user_id', user.id)
    await supabase.from('reminders').delete().eq('user_id', user.id)
    await supabase.from('budgets').delete().eq('user_id', user.id)
    await supabase.from('recurring_templates').delete().eq('user_id', user.id)
    await supabase.from('transactions').delete().eq('user_id', user.id)
    await supabase.from('receipts').delete().eq('user_id', user.id)
    await supabase.from('wallets').delete().eq('user_id', user.id)
    await supabase.from('categories').delete().eq('user_id', user.id)
    await supabase.from('profiles').delete().eq('id', user.id)
    
    // Sign out user session
    await supabase.auth.signOut()
    
    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('GDPR Delete Error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Gagal menghapus data akun' }
  }
}
