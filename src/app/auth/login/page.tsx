import { Metadata } from 'next'
import Script from 'next/script'
import { LoginCardClient } from '@/components/auth/LoginCardClient'

export const metadata: Metadata = {
  title: 'Login | Fimo',
  description: 'Masuk ke akun Fimo Anda untuk mengelola keuangan dengan cerdas.',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      <Script 
        src="https://accounts.google.com/gsi/client" 
        strategy="afterInteractive"
      />
      {/* Decorative blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-cyan-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

      <LoginCardClient />
    </div>
  )
}
