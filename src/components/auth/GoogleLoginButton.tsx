'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { GoogleIcon } from '@/components/auth/GoogleIcon'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export function GoogleLoginButton() {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const handleLogin = async () => {
    setIsLoading(true)
    
    let url = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    url = url.endsWith('/') ? url.slice(0, -1) : url

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${url}/auth/callback`,
      },
    })
    // No need to set isLoading to false because it will redirect away
  }

  return (
    <Button
      variant="outline"
      onClick={handleLogin}
      disabled={isLoading}
      className="w-full h-12 text-base font-medium bg-slate-900 hover:bg-slate-800 text-white border-none transition-all duration-200"
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      ) : (
        <GoogleIcon className="mr-2 h-5 w-5" />
      )}
      {isLoading ? 'Mengalihkan...' : 'Lanjut dengan Google'}
    </Button>
  )
}
