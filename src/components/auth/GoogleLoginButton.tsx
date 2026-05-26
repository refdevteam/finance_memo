'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { GoogleIcon } from '@/components/auth/GoogleIcon'
import { Loader2 } from 'lucide-react'

export function GoogleLoginButton() {
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = () => {
    setIsLoading(true)
    // Gunakan native browser navigation ke Route Handler khusus OAuth
    window.location.href = '/auth/login/google'
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
