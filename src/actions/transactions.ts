'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Skema validasi untuk transaksi
const transactionSchema = z.object({
  wallet_id: z.string().uuid("Dompet harus dipilih"),
  category_id: z.string().uuid("Kategori harus dipilih"),
  amount: z.coerce.number().min(1, "Jumlah harus lebih dari 0"),
  type: z.enum(['income', 'expense', 'transfer']),
  description: z.string().optional(),
  transaction_date: z.string().min(1, "Tanggal transaksi wajib diisi"),
})

export type TransactionInput = z.infer<typeof transactionSchema>

export async function addTransaction(data: TransactionInput) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Kamu harus login terlebih dahulu.' }
    }

    // Validasi data input
    const validatedData = transactionSchema.safeParse(data)
    if (!validatedData.success) {
      return { 
        success: false, 
        error: validatedData.error.issues[0].message 
      }
    }

    // Insert ke tabel transactions
    // Saldo dompet akan ter-update otomatis berkat Trigger di Postgres
    const { error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        wallet_id: validatedData.data.wallet_id,
        category_id: validatedData.data.category_id,
        amount: validatedData.data.amount,
        type: validatedData.data.type,
        description: validatedData.data.description || null,
        transaction_date: validatedData.data.transaction_date,
      })

    if (error) {
      console.error('Error adding transaction:', error)
      return { success: false, error: 'Gagal menambahkan transaksi.' }
    }

    // Revalidate dashboard agar saldo dan chart langsung terupdate
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/wallets')
    
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Terjadi kesalahan sistem.' }
  }
}

export async function updateTransaction(id: string, data: TransactionInput) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Kamu harus login terlebih dahulu.' }
    }

    const validatedData = transactionSchema.safeParse(data)
    if (!validatedData.success) {
      return { 
        success: false, 
        error: validatedData.error.issues[0].message 
      }
    }

    // Pastikan transaksi ini milik user
    const { data: existingTrx } = await supabase
      .from('transactions')
      .select('user_id, type')
      .eq('id', id)
      .single()

    if (!existingTrx || existingTrx.user_id !== user.id) {
      return { success: false, error: 'Transaksi tidak ditemukan atau akses ditolak.' }
    }

    if (existingTrx.type === 'transfer') {
      return { success: false, error: 'Edit transaksi transfer tidak didukung saat ini.' }
    }

    // Update tabel, trigger otomatis menyesuaikan saldo
    const { error } = await supabase
      .from('transactions')
      .update({
        wallet_id: validatedData.data.wallet_id,
        category_id: validatedData.data.category_id,
        amount: validatedData.data.amount,
        type: validatedData.data.type,
        description: validatedData.data.description || null,
        transaction_date: validatedData.data.transaction_date,
      })
      .eq('id', id)

    if (error) {
      console.error('Error updating transaction:', error)
      return { success: false, error: 'Gagal memperbarui transaksi.' }
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/wallets')
    revalidatePath('/dashboard/transactions')
    
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Terjadi kesalahan sistem.' }
  }
}

export async function deleteTransaction(id: string) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Kamu harus login terlebih dahulu.' }
    }

    // Pengecekan kepemilikan dan tipe transfer
    const { data: existingTrx } = await supabase
      .from('transactions')
      .select('user_id, type')
      .eq('id', id)
      .single()

    if (!existingTrx || existingTrx.user_id !== user.id) {
      return { success: false, error: 'Transaksi tidak ditemukan atau akses ditolak.' }
    }

    if (existingTrx.type === 'transfer') {
      return { success: false, error: 'Hapus transaksi transfer tidak didukung saat ini.' }
    }

    // Delete tabel, trigger otomatis mengembalikan saldo
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting transaction:', error)
      return { success: false, error: 'Gagal menghapus transaksi.' }
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/wallets')
    revalidatePath('/dashboard/transactions')
    
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Terjadi kesalahan sistem.' }
  }
}
