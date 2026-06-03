import { Sidebar } from '@/components/layout/Sidebar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')



  // Onboarding check in layout to ensure all dashboard subpages are protected
  // Except onboarding itself to avoid loop
  // Actually, we can check path here if needed, but the page itself handles it too.

  const [walletsRes, categoriesRes] = await Promise.all([
    supabase.from('wallets').select('id, name, balance').eq('user_id', user.id).eq('is_active', true),
    supabase.from('categories').select('id, name, type').or(`user_id.eq.${user.id},user_id.is.null`)
  ])

  const wallets = walletsRes.data || []
  const categories = categoriesRes.data || []

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar wallets={wallets} categories={categories} />
      <main className="flex-1 overflow-y-auto h-screen pt-14 md:pt-0 pb-28 md:pb-0">
        {children}
      </main>
    </div>
  )
}
