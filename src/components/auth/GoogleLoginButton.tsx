'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { verifyTurnstileToken } from '@/actions/auth'
import { cn } from '@/lib/utils'

interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            nonce?: string;
            auto_select?: boolean;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              width?: string;
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
            }
          ) => void;
          prompt: (callback?: (notification: {
            isNotDisplayed: () => boolean;
            getNotDisplayedReason: () => string;
          }) => void) => void;
          disableAutoSelect: () => void;
        };
      };
    };
    turnstile?: {
      render: (element: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

export function GoogleLoginButton() {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [buttonWidth, setButtonWidth] = useState(320)
  const [mounted, setMounted] = useState(false)

  // Anti-bot states
  const [isVerified, setIsVerified] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  // Nonce untuk Google Sign-In (diperlukan saat FedCM aktif, khususnya di mobile Chrome)
  // Gunakan ref agar handleCredentialResponse selalu membaca nilai terbaru
  const rawNonceRef = useRef<string | null>(null)
  const [hashedNonce, setHashedNonce] = useState<string | null>(null)

  // Gunakan mounted state untuk menghindari perbedaan rendering SSR dan Client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Mengatur lebar tombol agar responsif sesuai layar saat mounting
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const width = Math.min(380, window.innerWidth - 64)
      setButtonWidth(Math.max(200, width))
    }
  }, [])

  // Memantau ketersediaan SDK Google Identity Services
  useEffect(() => {
    const checkGoogle = () => {
      if (window.google?.accounts?.id) {
        setIsGoogleLoaded(true)
      }
    }

    checkGoogle()

    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        setIsGoogleLoaded(true)
        clearInterval(interval)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [])

  // Inisialisasi Cloudflare Turnstile secara dinamis
  useEffect(() => {
    if (!mounted) return

    // Set callback global sebelum memuat script Turnstile
    window.onloadTurnstileCallback = () => {
      if (window.turnstile) {
        window.turnstile.render('#turnstile-widget', {
          sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA', // testing sitekey
          theme: resolvedTheme === 'dark' ? 'dark' : 'light',
          callback: async (token: string) => {
            try {
              setErrorMsg(null)
              const success = await verifyTurnstileToken(token)
              if (success) {
                setTurnstileToken(token)
                setIsVerified(true)
              } else {
                setErrorMsg('Verifikasi keamanan captcha gagal. Silakan coba lagi.')
              }
            } catch (err) {
              console.error('Error verifying captcha:', err)
              setErrorMsg('Kesalahan sistem saat memverifikasi captcha.')
            }
          },
          'error-callback': () => {
            setErrorMsg('Gagal memuat Cloudflare Turnstile. Periksa koneksi internet Anda.')
          }
        })
      }
    }

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback'
    script.async = true
    script.defer = true
    document.body.appendChild(script)

    return () => {
      try {
        document.body.removeChild(script)
      } catch {
        // Abaikan jika sudah di-remove
      }
      delete window.onloadTurnstileCallback
    }
  }, [mounted, resolvedTheme])

  // Callback setelah sukses login di pop-up Google
  const handleCredentialResponse = useCallback(async (response: GoogleCredentialResponse) => {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
        // Teruskan raw nonce ke Supabase agar cocok dengan hashed nonce yang dikirim ke Google
        // Ini diperlukan di mobile Chrome karena FedCM selalu menyematkan nonce ke id_token
        nonce: rawNonceRef.current || undefined,
        options: {
          captchaToken: turnstileToken || undefined,
        }
      })

      if (error) {
        console.error('Error signing in with ID token:', error.message)
        setErrorMsg(error.message)
        setIsLoading(false)
        return
      }

      // Berhasil masuk, arahkan ke dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      console.error('Unexpected login error:', err)
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan sistem'
      setErrorMsg(message)
      setIsLoading(false)
    }
  }, [router, turnstileToken])

  // Generate nonce saat user lolos captcha (isVerified = true)
  // Nonce diperlukan agar Google Sign-In dan Supabase cocok, terutama di mobile Chrome (FedCM)
  useEffect(() => {
    if (!isVerified) return

    const generateNonce = async () => {
      // 1. Buat random bytes sebagai raw nonce
      const array = new Uint8Array(32)
      crypto.getRandomValues(array)
      const rawNonce = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')

      // 2. Hash nonce dengan SHA-256 untuk dikirim ke Google
      const encoder = new TextEncoder()
      const data = encoder.encode(rawNonce)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashed = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      // Simpan keduanya: raw ke ref (untuk signInWithIdToken), hashed ke state (untuk GSI initialize)
      rawNonceRef.current = rawNonce
      setHashedNonce(hashed)
    }

    generateNonce().catch(err => console.error('Gagal generate nonce:', err))
  }, [isVerified])

  // Inisialisasi GSI dan Render Tombol hanya jika user terverifikasi dan nonce sudah siap
  useEffect(() => {
    if (!isVerified || !isGoogleLoaded || !mounted || !hashedNonce) return

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) {
      console.error('NEXT_PUBLIC_GOOGLE_CLIENT_ID tidak ditemukan!')
      setErrorMsg('Google Client ID belum dikonfigurasi di .env.local')
      return
    }

    try {
      window.google!.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        // Kirim hashed nonce ke Google — di mobile Chrome, FedCM akan menyertakan nonce ini
        // ke dalam id_token, kemudian raw nonce dikirim ke Supabase untuk diverifikasi
        nonce: hashedNonce,
      })

      const buttonDiv = document.getElementById('google-signin-btn-container')
      if (buttonDiv) {
        buttonDiv.innerHTML = '' // Bersihkan container sebelum render ulang tombol untuk mengikuti perubahan tema
        window.google!.accounts.id.renderButton(buttonDiv, {
          theme: resolvedTheme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          width: buttonWidth.toString(),
          text: 'continue_with',
          shape: 'pill',
        })
      }

      // Tampilkan Google One Tap
      window.google!.accounts.id.prompt()

    } catch (err) {
      console.error('Error in GSI initialization/rendering:', err)
    }
  }, [isVerified, isGoogleLoaded, resolvedTheme, buttonWidth, handleCredentialResponse, mounted, hashedNonce])

  return (
    <div className="w-full space-y-4 flex flex-col items-center justify-center" style={{ colorScheme: 'light' }}>
      
      {/* Cloudflare Turnstile Widget Container */}
      <div 
        id="turnstile-widget" 
        className={cn("w-full flex justify-center", !isVerified ? 'block' : 'hidden')}
        style={{ minHeight: '65px' }}
      />

      {/* Container tombol resmi Google GSI */}
      <div 
        id="google-signin-btn-container" 
        className={`w-full flex justify-center ${(isVerified && isGoogleLoaded && !isLoading) ? 'block' : 'hidden'}`}
        style={{ minHeight: '48px', colorScheme: 'light' }}
      />

      {/* State Loading (fallback UI) */}
      {isVerified && (!isGoogleLoaded || isLoading) && (
        <Button
          variant="outline"
          disabled={true}
          className="w-full h-12 text-base font-medium bg-slate-900 dark:bg-slate-800 text-white border-none transition-all duration-200 flex items-center justify-center rounded-full"
        >
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {isLoading ? 'Mengautentikasi...' : 'Memuat Google Login...'}
        </Button>
      )}

      {errorMsg && (
        <p className="text-sm text-red-500 text-center font-medium mt-1">
          {errorMsg}
        </p>
      )}
    </div>
  )
}
