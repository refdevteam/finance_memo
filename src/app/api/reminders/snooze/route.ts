import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { reminder_id, snooze_days, custom_date } = body

    if (!reminder_id || (typeof snooze_days !== 'number' && !custom_date)) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // Fetch the reminder details
    const { data: reminder, error: fetchError } = await supabase
      .from('reminders')
      .select('*')
      .eq('id', reminder_id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !reminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 })
    }

    let newDueDateStr = ''
    if (custom_date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(custom_date)) {
        return NextResponse.json({ error: 'Invalid custom_date format (YYYY-MM-DD)' }, { status: 400 })
      }
      newDueDateStr = custom_date
    } else {
      // Calculate new due date by adding snooze_days
      const currentDueDate = new Date(reminder.due_date + 'T00:00:00')
      currentDueDate.setDate(currentDueDate.getDate() + (snooze_days || 0))
      newDueDateStr = currentDueDate.toISOString().split('T')[0]
    }

    // Fetch user timezone
    const { data: profile } = await supabase
      .from('profiles')
      .select('timezone')
      .eq('id', user.id)
      .single()
    const tz = profile?.timezone || 'Asia/Jakarta'

    // Calculate next_remind timezone offset at 07:00 AM
    const dateStr = `${newDueDateStr}T07:00:00`
    const date = new Date(dateStr)
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'longOffset'
    }).formatToParts(date)
    const tzName = parts.find(p => p.type === 'timeZoneName')?.value || ''
    let offset = '+00:00'
    if (tzName !== 'GMT') {
      const match = tzName.match(/GMT([+-])(\d+)(?::(\d+))?/)
      if (match) {
        const sign = match[1]
        const hours = match[2].padStart(2, '0')
        const minutes = match[3] || '00'
        offset = `${sign}${hours}:${minutes.padStart(2, '0')}`
      }
    }
    const nextRemind = `${dateStr}${offset}`

    const { error: updateError } = await supabase
      .from('reminders')
      .update({
        due_date: newDueDateStr,
        next_remind: nextRemind,
        is_active: true
      })
      .eq('id', reminder_id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, new_due_date: newDueDateStr })
  } catch (error) {
    console.error('Error in snooze API:', error)
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
