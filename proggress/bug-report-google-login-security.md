# Bug Report: Kegagalan Login Google One Tap & Celah Keamanan Bot (Login Security)

**Project:** Finance Memo  
**Files:** `GoogleLoginButton.tsx`, `LoginCardClient.tsx`  
**Status:** 🔴 Critical — Masalah pada proses autentikasi One Tap & Ketiadaan proteksi bot  
**Reporter:** Code Review / Security Auditor

---

## Ringkasan Masalah

1. **Gagal Login Google One Tap:** Ketika aplikasi Fimo memunculkan *bottom sheet* Google One Tap yang berisi daftar akun Google pengguna, mengklik salah satu akun tersebut menyebabkan error/kegagalan masuk. Hal ini memaksa pengguna untuk dialihkan ke halaman persetujuan login Google eksternal secara terpisah (redirect OAuth).
2. **Ketiadaan Proteksi Bot:** Halaman login belum memiliki proteksi untuk menyaring bot/crawlers otomatis yang dapat memicu serangan spam autentikasi atau brute force melalui API OAuth.

---

## Root Cause

### 1. Masalah Kuki Pihak Ketiga & Ketidakhadiran FedCM
Pada peramban Chrome versi terbaru, akses kuki pihak ketiga secara default mulai dibatasi. Google One Tap menggunakan kuki pihak ketiga untuk mendeteksi sesi Google aktif pengguna.
Ketika kuki ini diblokir, One Tap gagal beroperasi secara aman di dalam *iframe* popup GSI, kecuali fitur **FedCM (Federated Credential Management API)** diaktifkan secara eksplisit.
Saat ini, inisialisasi GSI di `GoogleLoginButton.tsx` belum menyertakan konfigurasi `use_fedcm_for_prompt: true`.

```typescript
// ❌ BERMASALAH — Belum mengaktifkan FedCM untuk kompatibilitas Chrome
window.google!.accounts.id.initialize({
  client_id: clientId,
  callback: handleCredentialResponse,
})
```

### 2. Pemuatan One Tap Otomatis Tanpa Interaksi (Kerentanan Bot)
Metode `window.google!.accounts.id.prompt()` dipanggil secara otomatis saat komponen dimuat (*mount*), tanpa memeriksa apakah pengguna adalah bot atau manusia. Hal ini memungkinkan bot pencari lubang keamanan (crawlers) untuk langsung memicu proses autentikasi atau spamming API Google.

---

## Proposed Fix (Solusi)

### Fix 1 — Aktifkan FedCM pada GSI
Menambahkan properti `use_fedcm_for_prompt: true` pada inisialisasi Google Accounts untuk mematuhi standar Google Identity Services terbaru.

```typescript
// ✅ SOLUSI — FedCM Aktif, kompatibel dengan pemblokiran kuki Chrome terbaru
window.google!.accounts.id.initialize({
  client_id: clientId,
  callback: handleCredentialResponse,
  use_fedcm_for_prompt: true, // Bypass pembatasan third-party cookies secara aman via API browser
})
```

### Fix 2 — Proteksi Anti-Bot (Honeypot & Kotak Centang Manusia)
Untuk mematuhi aturan keamanan Fimo dan standard pengkodean:
1. **Honeypot Field:** Kolom input tersembunyi (`website_api_bypass`) yang tidak terlihat oleh manusia tetapi biasanya otomatis diisi oleh bot pengisi form. Jika kolom ini terdeteksi memiliki isi, proses login langsung ditolak.
2. **Saya Bukan Robot Checkbox:** Menambahkan kotak centang neo-brutalist interaktif. SDK Google GSI dan prompt Google One Tap **hanya akan diinisialisasi dan ditampilkan** setelah pengguna mencentang kotak ini. Hal ini secara efektif menghentikan bot otomatis dari memicu login Google secara instan.

---

## Implementasi Kode (Rencana Perubahan)

### `GoogleLoginButton.tsx`
```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Loader2, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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
            auto_select?: boolean;
            use_fedcm_for_prompt?: boolean; // Menambahkan opsi FedCM
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
        };
      };
    };
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
  const [honeypot, setHoneypot] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const width = Math.min(380, window.innerWidth - 64)
      setButtonWidth(Math.max(200, width))
    }
  }, [])

  // Memantau ketersediaan SDK Google
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

  const handleCredentialResponse = useCallback(async (response: GoogleCredentialResponse) => {
    // PROTEKSI BOT 1: Cek Honeypot
    if (honeypot.trim() !== '') {
      console.warn('[Security] Bot detected via honeypot field submission!')
      setErrorMsg('Autentikasi ditolak.')
      return
    }

    setIsLoading(true)
    setErrorMsg(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
      })

      if (error) {
        console.error('Error signing in with ID token:', error.message)
        setErrorMsg(error.message)
        setIsLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      console.error('Unexpected login error:', err)
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan sistem'
      setErrorMsg(message)
      setIsLoading(false)
    }
  }, [router, honeypot])

  // Inisialisasi GSI dan Render Tombol hanya jika user terverifikasi (isVerified === true)
  useEffect(() => {
    if (!isVerified || !isGoogleLoaded || !mounted) return

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) {
      console.error('NEXT_PUBLIC_GOOGLE_CLIENT_ID tidak ditemukan!')
      setErrorMsg('Google Client ID belum dikonfigurasi')
      return
    }

    try {
      window.google!.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        use_fedcm_for_prompt: true, // FIX 1: Aktifkan FedCM
      })

      const buttonDiv = document.getElementById('google-signin-btn-container')
      if (buttonDiv) {
        buttonDiv.innerHTML = ''
        window.google!.accounts.id.renderButton(buttonDiv, {
          theme: resolvedTheme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          width: buttonWidth.toString(),
          text: 'continue_with',
          shape: 'pill',
        })
      }

      // Opsional: Tampilkan Google One Tap
      window.google!.accounts.id.prompt()
    } catch (err) {
      console.error('Error in GSI initialization/rendering:', err)
    }
  }, [isVerified, isGoogleLoaded, resolvedTheme, buttonWidth, handleCredentialResponse, mounted])

  return (
    <div className="w-full space-y-4 flex flex-col items-center justify-center" style={{ colorScheme: 'light' }}>
      
      {/* PROTEKSI BOT 2: Honeypot Input (sr-only tersembunyi dari manusia) */}
      <input
        type="text"
        name="website_api_bypass"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        className="sr-only"
        tabIndex={-1}
        autoComplete="off"
      />

      {/* PROTEKSI BOT 3: Checkbox Verifikasi Manusia */}
      {!isVerified && (
        <label className="flex items-center space-x-3 p-3.5 bg-neutral-50 dark:bg-zinc-800/50 border-2 border-black dark:border-zinc-700 rounded-2xl cursor-pointer hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-all select-none w-full shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(255,255,255,0.05)]">
          <input
            type="checkbox"
            checked={isVerified}
            onChange={(e) => setIsVerified(e.target.checked)}
            className="w-5 h-5 accent-emerald-500 rounded border-2 border-black cursor-pointer"
          />
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Verifikasi Keamanan
            </span>
            <span className="text-[9px] text-neutral-400">Centang untuk memuat opsi Google Sign-In</span>
          </div>
        </label>
      )}

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
```

---

## Ringkasan per Perspektif

| Role | Temuan & Kontribusi |
|------|---------------------|
| **Dev / Security** | Mengaktifkan opsi `use_fedcm_for_prompt: true` untuk Chrome compatibility, menambahkan form honeypot tersembunyi `website_api_bypass`, serta menunda inisialisasi GSI sampai checkbox centang bernilai true. |
| **QA** | Memverifikasi kegagalan jika honeypot terisi. Memastikan kotak dialog google-signin-btn-container tersembunyi saat `isVerified` false, dan muncul saat `isVerified` true. |
| **PM / UX** | Alur login Google tetap ramah pengguna, dengan tambahan verifikasi visual brutalist "Saya bukan robot" yang serasi dengan identitas desain Fimo. |

---
*Generated from code review & security audit — Fimo Project*
