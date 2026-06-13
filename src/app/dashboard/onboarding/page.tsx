import { createClient } from '@/lib/supabase/server'
import { OnboardingForm } from '@/components/onboarding/OnboardingForm'
import { redirect } from 'next/navigation'

export default async function OnboardingPage() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.onboarded) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-background relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-100 dark:bg-emerald-900/20 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-teal-100 dark:bg-teal-900/20 rounded-full blur-3xl opacity-50"></div>
      
      <div className="w-full max-w-lg z-10 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Selamat Datang di <span className="text-emerald-600">Fimo</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Hanya beberapa langkah lagi sebelum Anda bisa mulai mengelola keuangan.
          </p>
        </div>
        
        <OnboardingForm initialData={profile || {}} />
      </div>
    </div>
  )
}
