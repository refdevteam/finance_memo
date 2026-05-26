'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { GoogleIcon } from '@/components/auth/GoogleIcon'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function GoogleLoginButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleLogin = async () => {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) {
        console.error('Error signing in with Google:', error.message)
        setErrorMsg(error.message)
        setIsLoading(false)
      }
    } catch (err) {
      console.error('Unexpected login error:', err)
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan sistem'
      setErrorMsg(message)
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full space-y-2">
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
      {errorMsg && (
        <p className="text-sm text-red-500 text-center font-medium mt-1">
          {errorMsg}
        </p>
      )}
    </div>
  )
}

