import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()
  
  let siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  siteUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
    },
  })

  if (error) {
    console.error('Error initiating Google OAuth:', error.message)
    return NextResponse.redirect(`${siteUrl}/auth/login?error=oauth_init_failed`)
  }

  if (data.url) {
    // Redirect the user to the Supabase/Google OAuth URL
    return NextResponse.redirect(data.url)
  }

  return NextResponse.redirect(`${siteUrl}/auth/login?error=unknown`)
}
