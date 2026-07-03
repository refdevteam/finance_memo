'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signInWithGoogle() {
  const supabase = createClient()
  
  const getSiteUrl = () => {
    let url = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    // Pastikan tidak ada trailing slash
    url = url.endsWith('/') ? url.slice(0, -1) : url
    return url
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

export async function verifyTurnstileToken(token: string): Promise<boolean> {
  // Use testing secret key as default fallback for easy local dev
  const secretKey = process.env.TURNSTILE_SECRET_KEY || '1x00000000000000000000000000000000AA'
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
      }),
    })

    if (!res.ok) {
      console.error('Turnstile verification failed on Cloudflare network:', res.statusText)
      return false
    }

    const data = await res.json()
    return data.success === true
  } catch (err) {
    console.error('Error in Turnstile siteverify request:', err)
    return false
  }
}
