'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export const reminderSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi'),
  type: z.enum(['saving', 'installment', 'subscription', 'bill', 'custom']),
  amount: z.number().nullable().optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).nullable().optional(),
  channels: z.object({
    push: z.boolean().default(true),
    email: z.boolean().default(false),
    inapp: z.boolean().default(true),
  }).default({ push: true, email: false, inapp: true }),
  notes: z.string().nullable().optional(),
})

export type ReminderInput = z.infer<typeof reminderSchema>

// Helper to calculate next_remind based on due_date and timezone at 07:00 AM
function calculateNextRemind(dueDateStr: string, timeZone: string): string {
  try {
    const dateStr = `${dueDateStr}T07:00:00`
    const date = new Date(dateStr)
    
    // Get timezone offset string (e.g. +07:00)
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset'
    }).formatToParts(date)
    
    const tzName = parts.find(p => p.type === 'timeZoneName')?.value || ''
    let offset = '+00:00'
    if (tzName === 'GMT') {
      offset = '+00:00'
    } else {
      const match = tzName.match(/GMT([+-])(\d+)(?::(\d+))?/)
      if (match) {
        const sign = match[1] // "+" atau "-"
        const hours = match[2].padStart(2, '0') // Memastikan 2 digit jam (e.g. "07")
        const minutes = match[3] || '00'
        offset = `${sign}${hours}:${minutes.padStart(2, '0')}`
      }
    }
    
    return `${dateStr}${offset}`
  } catch (error) {
    console.error('Error calculating next remind time:', error)
    return `${dueDateStr}T07:00:00+07:00` // fallback to Jakarta offset
  }
}

export async function getReminders() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('Unauthorized')
    }

    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .order('due_date', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching reminders:', error)
    throw error
  }
}

export async function createReminder(data: ReminderInput) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Kamu harus login terlebih dahulu.' }
    }

    const parsed = reminderSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    // Get user timezone
    const { data: profile } = await supabase
      .from('profiles')
      .select('timezone')
      .eq('id', user.id)
      .single()

    const tz = profile?.timezone || 'Asia/Jakarta'
    const nextRemind = calculateNextRemind(parsed.data.due_date, tz)

    const { error } = await supabase
      .from('reminders')
      .insert({
        user_id: user.id,
        title: parsed.data.title,
        type: parsed.data.type,
        amount: parsed.data.amount ?? null,
        due_date: parsed.data.due_date,
        frequency: parsed.data.frequency || null,
        channels: parsed.data.channels,
        notes: parsed.data.notes || null,
        next_remind: nextRemind,
        is_active: true,
      })

    if (error) throw error

    revalidatePath('/dashboard/reminders')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error creating reminder:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Gagal membuat pengingat.' }
  }
}

export async function updateReminder(id: string, data: ReminderInput) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Kamu harus login terlebih dahulu.' }
    }

    const parsed = reminderSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    // Get user timezone
    const { data: profile } = await supabase
      .from('profiles')
      .select('timezone')
      .eq('id', user.id)
      .single()

    const tz = profile?.timezone || 'Asia/Jakarta'
    const nextRemind = calculateNextRemind(parsed.data.due_date, tz)

    const { error } = await supabase
      .from('reminders')
      .update({
        title: parsed.data.title,
        type: parsed.data.type,
        amount: parsed.data.amount ?? null,
        due_date: parsed.data.due_date,
        frequency: parsed.data.frequency || null,
        channels: parsed.data.channels,
        notes: parsed.data.notes || null,
        next_remind: nextRemind,
      })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    revalidatePath('/dashboard/reminders')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error updating reminder:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Gagal memperbarui pengingat.' }
  }
}

export async function toggleReminderStatus(id: string, isActive: boolean) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Kamu harus login terlebih dahulu.' }
    }

    // If setting active to true, recalculate next_remind
    let nextRemind: string | null = null
    if (isActive) {
      const { data: reminder } = await supabase
        .from('reminders')
        .select('due_date')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (reminder) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('timezone')
          .eq('id', user.id)
          .single()

        const tz = profile?.timezone || 'Asia/Jakarta'
        nextRemind = calculateNextRemind(reminder.due_date, tz)
      }
    }

    const { error } = await supabase
      .from('reminders')
      .update({
        is_active: isActive,
        next_remind: isActive ? nextRemind : null,
      })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    revalidatePath('/dashboard/reminders')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error toggling reminder status:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Gagal mengubah status pengingat.' }
  }
}

export async function deleteReminder(id: string) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Kamu harus login terlebih dahulu.' }
    }

    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    revalidatePath('/dashboard/reminders')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error deleting reminder:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Gagal menghapus pengingat.' }
  }
}

export async function completeReminder(id: string) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Kamu harus login terlebih dahulu.' }
    }

    // Fetch the reminder details
    const { data: reminder, error: fetchError } = await supabase
      .from('reminders')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !reminder) {
      return { success: false, error: 'Pengingat tidak ditemukan.' }
    }

    if (reminder.frequency === null) {
      // One-off: deactivate
      const { error } = await supabase
        .from('reminders')
        .update({
          is_active: false,
          next_remind: null
        })
        .eq('id', id)
      if (error) throw error
    } else {
      // Recalculate next due date
      const currentDueDate = new Date(reminder.due_date + 'T00:00:00')
      const nextDueDate = new Date(currentDueDate)

      if (reminder.frequency === 'daily') {
        nextDueDate.setDate(currentDueDate.getDate() + 1)
      } else if (reminder.frequency === 'weekly') {
        nextDueDate.setDate(currentDueDate.getDate() + 7)
      } else if (reminder.frequency === 'monthly') {
        nextDueDate.setMonth(currentDueDate.getMonth() + 1)
      } else if (reminder.frequency === 'yearly') {
        nextDueDate.setFullYear(currentDueDate.getFullYear() + 1)
      }

      const nextDueDateStr = nextDueDate.toISOString().split('T')[0]

      // Fetch user timezone
      const { data: profile } = await supabase
        .from('profiles')
        .select('timezone')
        .eq('id', user.id)
        .single()
      const tz = profile?.timezone || 'Asia/Jakarta'
      const nextRemind = calculateNextRemind(nextDueDateStr, tz)

      const { error } = await supabase
        .from('reminders')
        .update({
          due_date: nextDueDateStr,
          next_remind: nextRemind
        })
        .eq('id', id)
      if (error) throw error
    }

    revalidatePath('/dashboard/reminders')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error completing reminder:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Gagal menyelesaikan pengingat.' }
  }
}

