'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Validation Schema for Recurring Template
const recurringSchema = z.object({
  wallet_id: z.string().uuid("Dompet harus dipilih"),
  category_id: z.string().uuid("Kategori harus dipilih").nullable().optional(),
  name: z.string().min(1, "Nama rencana wajib diisi"),
  amount: z.coerce.number().min(1, "Jumlah harus lebih dari 0"),
  type: z.enum(['income', 'expense']),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  next_due_date: z.string().min(1, "Tanggal mulai/jatuh tempo wajib diisi"),
  end_date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export type RecurringInput = z.infer<typeof recurringSchema>

export async function getRecurringTemplates() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('recurring_templates')
    .select(`
      id,
      name,
      amount,
      type,
      frequency,
      next_due_date,
      end_date,
      is_active,
      notes,
      wallet_id,
      category_id,
      categories (
        name,
        icon,
        color
      ),
      wallets (
        name
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching recurring templates:', error)
    throw error
  }
  return data || []
}

export async function createRecurringTemplate(data: RecurringInput) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Kamu harus login terlebih dahulu.' }
    }

    const validatedData = recurringSchema.safeParse(data)
    if (!validatedData.success) {
      return { 
        success: false, 
        error: validatedData.error.issues[0].message 
      }
    }

    const { error } = await supabase
      .from('recurring_templates')
      .insert({
        user_id: user.id,
        wallet_id: validatedData.data.wallet_id,
        category_id: validatedData.data.category_id || null,
        name: validatedData.data.name,
        amount: validatedData.data.amount,
        type: validatedData.data.type,
        frequency: validatedData.data.frequency,
        next_due_date: validatedData.data.next_due_date,
        end_date: validatedData.data.end_date || null,
        notes: validatedData.data.notes || null,
        is_active: true
      })

    if (error) {
      console.error('Error creating recurring template:', error)
      return { success: false, error: 'Gagal membuat rencana transaksi berulang.' }
    }

    revalidatePath('/dashboard/transactions')
    revalidatePath('/dashboard/transactions/recurring')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Terjadi kesalahan sistem.' }
  }
}

export async function updateRecurringTemplate(id: string, data: RecurringInput) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Kamu harus login terlebih dahulu.' }
    }

    const validatedData = recurringSchema.safeParse(data)
    if (!validatedData.success) {
      return { 
        success: false, 
        error: validatedData.error.issues[0].message 
      }
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from('recurring_templates')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!existing || existing.user_id !== user.id) {
      return { success: false, error: 'Rencana tidak ditemukan atau akses ditolak.' }
    }

    const { error } = await supabase
      .from('recurring_templates')
      .update({
        wallet_id: validatedData.data.wallet_id,
        category_id: validatedData.data.category_id || null,
        name: validatedData.data.name,
        amount: validatedData.data.amount,
        type: validatedData.data.type,
        frequency: validatedData.data.frequency,
        next_due_date: validatedData.data.next_due_date,
        end_date: validatedData.data.end_date || null,
        notes: validatedData.data.notes || null,
      })
      .eq('id', id)

    if (error) {
      console.error('Error updating recurring template:', error)
      return { success: false, error: 'Gagal memperbarui rencana transaksi berulang.' }
    }

    revalidatePath('/dashboard/transactions')
    revalidatePath('/dashboard/transactions/recurring')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Terjadi kesalahan sistem.' }
  }
}

export async function toggleRecurringStatus(id: string, isActive: boolean) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Kamu harus login terlebih dahulu.' }
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from('recurring_templates')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!existing || existing.user_id !== user.id) {
      return { success: false, error: 'Rencana tidak ditemukan atau akses ditolak.' }
    }

    const { error } = await supabase
      .from('recurring_templates')
      .update({ is_active: isActive })
      .eq('id', id)

    if (error) {
      console.error('Error toggling recurring status:', error)
      return { success: false, error: 'Gagal mengubah status rencana.' }
    }

    revalidatePath('/dashboard/transactions')
    revalidatePath('/dashboard/transactions/recurring')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Terjadi kesalahan sistem.' }
  }
}

export async function deleteRecurringTemplate(id: string) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Kamu harus login terlebih dahulu.' }
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from('recurring_templates')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!existing || existing.user_id !== user.id) {
      return { success: false, error: 'Rencana tidak ditemukan atau akses ditolak.' }
    }

    const { error } = await supabase
      .from('recurring_templates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting recurring template:', error)
      return { success: false, error: 'Gagal menghapus rencana transaksi berulang.' }
    }

    revalidatePath('/dashboard/transactions')
    revalidatePath('/dashboard/transactions/recurring')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Terjadi kesalahan sistem.' }
  }
}
