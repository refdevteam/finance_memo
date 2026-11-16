'use server'

import { createClient } from '@/lib/supabase/server'
import { consumeRateLimit, clientIp } from '@/lib/rate-limit'
import { headers } from 'next/headers'
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
  // Dipanggil sebelum login, jadi tidak ada sesi yang bisa dipakai. Batasi per
  // IP agar endpoint ini tidak menjadi proxy gratis ke Cloudflare siteverify.
  const ip = clientIp(await headers())
  const allowed = await consumeRateLimit(
    createClient(),
    `turnstile:${ip}`,
    10,
    60
  )
  if (!allowed) {
    console.warn('[Turnstile] rate limit terlampaui untuk IP', ip)
    return false
  }

  // Cloudflare menyediakan "always-pass" test secret untuk uji lokal. Secret
  // itu membuat verifikasi SELALU sukses, jadi kalau kepakai di production
  // proteksinya mati diam-diam (bypass CAPTCHA total) hanya karena variabel
  // env belum diisi. Di production kita gagal-tertutup.
  const configured = process.env.TURNSTILE_SECRET_KEY
  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      console.error("[Turnstile] TURNSTILE_SECRET_KEY belum diset — verifikasi ditolak (fail-closed).")
      return false
    }
    console.warn("[Turnstile] TURNSTILE_SECRET_KEY belum diset — memakai test secret (hanya non-production).")
  }
  const secretKey = configured || "1x00000000000000000000000000000000AA"
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
