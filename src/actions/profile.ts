'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const profileSchema = z.object({
  full_name: z.string().min(1, 'Nama lengkap wajib diisi'),
  currency: z.string().min(1, 'Mata uang wajib dipilih'),
  timezone: z.string().min(1, 'Zona waktu wajib dipilih'),
})

const onboardingSchema = z.object({
  full_name: z.string().min(1, 'Nama lengkap wajib diisi'),
  currency: z.string().min(1, 'Mata uang wajib dipilih'),
  timezone: z.string().min(1, 'Zona waktu wajib dipilih'),
  wallet_name: z.string().min(1, 'Nama dompet wajib diisi'),
  wallet_type: z.enum(['cash', 'bank', 'ewallet', 'investment', 'other']),
  wallet_balance: z.coerce.number().nonnegative('Saldo awal tidak boleh negatif'),
})

export async function completeOnboarding(formData: z.infer<typeof onboardingSchema>) {
  const supabase = createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const parsed = onboardingSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  // 1. Update Profile (set onboarded = true)
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: parsed.data.full_name,
      currency: parsed.data.currency,
      timezone: parsed.data.timezone,
      onboarded: true,
    })
    .eq('id', user.id)

  if (profileError) {
    console.error('Error updating profile:', profileError.message)
    return { error: profileError.message }
  }

  // 2. Create the first wallet
  const defaultIcon = parsed.data.wallet_type === 'bank' ? '🏦' : parsed.data.wallet_type === 'ewallet' ? '📱' : '💵'
  const { error: walletError } = await supabase
    .from('wallets')
    .insert({
      user_id: user.id,
      name: parsed.data.wallet_name,
      type: parsed.data.wallet_type,
      balance: parsed.data.wallet_balance,
      currency: parsed.data.currency,
      color: '#10B981', // emerald color
      icon: defaultIcon,
      is_active: true,
    })

  if (walletError) {
    console.error('Error creating first wallet:', walletError.message)
    return { error: walletError.message }
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

export async function updateProfile(formData: { full_name: string; currency: string; timezone: string }) {
  const supabase = createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const parsed = profileSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: parsed.data.full_name,
      currency: parsed.data.currency,
      timezone: parsed.data.timezone,
    })
    .eq('id', user.id)

  if (error) {
    console.error('Error updating profile:', error.message)
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/settings')
  return { success: true }
}

