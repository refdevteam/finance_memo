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

export async function completeOnboarding(formData: z.infer<typeof profileSchema>) {
  const supabase = createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const parsed = profileSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      ...parsed.data,
      onboarded: true,
    })
    .eq('id', user.id)

  if (error) {
    console.error('Error updating profile:', error.message)
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
