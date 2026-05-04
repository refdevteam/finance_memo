'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
    })

  if (error) throw error
  
  revalidatePath('/dashboard/wallets')
  revalidatePath('/dashboard')
}

export async function deleteWallet(id: string) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('wallets')
    .delete()
    .eq('id', id)

  if (error) throw error

  revalidatePath('/dashboard/wallets')
  revalidatePath('/dashboard')
}
