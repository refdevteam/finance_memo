'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signInWithGoogle() {
  const supabase = createClient()
  
  // Gunakan VERCEL_URL jika ada (production), jika tidak gunakan NEXT_PUBLIC_SITE_URL
  const getSiteUrl = () => {
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
    return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${getSiteUrl()}/auth/callback`,
    },
  })

  if (error) {
    console.error('Error signing in with Google:', error.message)
    return
  }

  if (data.url) {
    redirect(data.url)
  }
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}
