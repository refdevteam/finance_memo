import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  let siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  siteUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl

  // Array to capture cookies that need to be set during OAuth initialization
  const responseCookies: Array<{ name: string; value: string; options: any }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            responseCookies.push({ name, value, options })
          })
        },
      },
    }
  )

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
    // Return redirect response with explicitly set cookies captured from signInWithOAuth
    const redirectResponse = NextResponse.redirect(data.url)
    responseCookies.forEach(({ name, value, options }) => {
      redirectResponse.cookies.set(name, value, options)
    })
    return redirectResponse
  }

  return NextResponse.redirect(`${siteUrl}/auth/login?error=unknown`)
}

