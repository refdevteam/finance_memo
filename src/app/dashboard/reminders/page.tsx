import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RemindersClient } from '@/components/reminders/RemindersClient'

export const dynamic = 'force-dynamic'

export default async function RemindersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded')
    .eq('id', user.id)
    .single()

  if (profile && !profile.onboarded) {
    redirect('/dashboard/onboarding')
  }

  const { data: reminders, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', user.id)
    .order('due_date', { ascending: true })

  if (error) {
    console.error('Error fetching reminders in page:', error)
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <RemindersClient initialReminders={reminders || []} />
    </div>
  )
}
