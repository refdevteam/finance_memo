import { Metadata } from 'next'
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton'
import { Button } from '@/components/ui/button'
import { GoogleIcon } from '@/components/auth/GoogleIcon'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Login | Fimo',
  description: 'Masuk ke akun Fimo Anda untuk mengelola keuangan dengan cerdas.',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-cyan-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

      <Card className="w-full max-w-md relative z-10 border-none shadow-2xl backdrop-blur-sm bg-white/80 dark:bg-slate-900/80">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200 dark:shadow-none">
                <span className="text-xl font-bold text-white">F</span>
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white">fimo</span>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Selamat Datang
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Kelola keuangan pribadi Anda dengan bantuan AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <GoogleLoginButton />
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-transparent px-2 text-slate-500 dark:text-slate-400">
                Aman & Terenkripsi
              </span>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 dark:text-slate-500 px-8">
            Dengan melanjutkan, Anda menyetujui Ketentuan Layanan dan Kebijakan Privasi kami.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
