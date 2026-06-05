import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getReminders } from '@/actions/reminders'
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

  const reminders = await getReminders()

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <RemindersClient initialReminders={reminders} />
    </div>
  )
}
