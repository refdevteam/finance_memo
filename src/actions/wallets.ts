'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

export async function getWallets() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createWallet(formData: {
  name: string
  type: string
  balance: number
  color?: string
  is_event_wallet?: boolean
  event_metadata?: Record<string, unknown>
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('wallets')
    .insert({
      user_id: user.id,
      name: formData.name,
      type: formData.type,
      balance: formData.balance,
      color: formData.color || '#10b981', // Default emerald
      is_event_wallet: formData.is_event_wallet || false,
      event_metadata: formData.event_metadata || null,
    })

  if (error) throw error
  
  revalidatePath('/dashboard/wallets')
  revalidatePath('/dashboard')
}

export async function updateWalletBalance(id: string, balance: number) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  // Rate Limit: 5x per day per user
  const cookieStore = cookies()
  const today = new Date().toISOString().split('T')[0]
  const rateLimitKey = `wallet_edit_count_${user.id}_${today}`
  const currentCount = parseInt(cookieStore.get(rateLimitKey)?.value || '0', 10)

  if (currentCount >= 5) {
    throw new Error('Batas edit saldo (5x per hari) telah tercapai.')
  }

  const { error } = await supabase
    .from('wallets')
    .update({ balance })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error

  // Increment rate limit counter
  cookieStore.set(rateLimitKey, (currentCount + 1).toString(), {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
    path: '/',
  })

  revalidatePath('/dashboard/wallets')
  revalidatePath('/dashboard')
}

export async function deleteWallet(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('wallets')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error

  revalidatePath('/dashboard/wallets')
  revalidatePath('/dashboard')
}
