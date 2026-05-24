'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Skema validasi untuk transfer
const transferSchema = z.object({
  from_wallet_id: z.string().uuid("Dompet asal harus dipilih"),
  to_wallet_id: z.string().uuid("Dompet tujuan harus dipilih"),
  amount: z.coerce.number().min(1, "Jumlah harus lebih dari 0"),
  notes: z.string().optional(),
  transfer_date: z.string().min(1, "Tanggal transfer wajib diisi"),
})

export type TransferInput = z.infer<typeof transferSchema>

export async function addTransfer(data: TransferInput) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Kamu harus login terlebih dahulu.' }
    }

    // Validasi data input
    const validatedData = transferSchema.safeParse(data)
    if (!validatedData.success) {
      return { 
        success: false, 
        error: validatedData.error.issues[0].message 
      }
    }

    if (validatedData.data.from_wallet_id === validatedData.data.to_wallet_id) {
      return { success: false, error: 'Dompet asal dan tujuan tidak boleh sama.' }
    }

    // Panggil RPC execute_wallet_transfer
    const { data: rpcData, error } = await supabase.rpc('execute_wallet_transfer', {
      p_user_id: user.id,
      p_from_wallet_id: validatedData.data.from_wallet_id,
      p_to_wallet_id: validatedData.data.to_wallet_id,
      p_amount: validatedData.data.amount,
      p_notes: validatedData.data.notes || '',
      p_transfer_date: validatedData.data.transfer_date
    })

    if (error) {
      console.error('Error executing transfer RPC:', error)
      return { success: false, error: 'Gagal memproses transfer.' }
    }

    // Parse respons RPC yang berupa JSONB
    // rpcData berisi { success: boolean, transfer_id?: string, error?: string }
    const result = rpcData as { success: boolean; error?: string; transfer_id?: string }
    
    if (!result || !result.success) {
      return { success: false, error: result?.error || 'Gagal memproses transfer.' }
    }

    // Revalidate dashboard agar saldo dan chart langsung terupdate
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/wallets')
    revalidatePath('/dashboard/transactions')
    
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Terjadi kesalahan sistem.' }
  }
}
