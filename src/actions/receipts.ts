'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markReceiptProcessed(receiptId: string) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  const { error } = await supabase
    .from('receipts')
    .update({ is_processed: true })
    .eq('id', receiptId)
    .eq('user_id', user.id)

  if (error) {
    // Jangan meneruskan pesan Supabase (memuat nama tabel/konstraint) ke klien.
    console.error('Error marking receipt processed:', error.message)
    throw new Error('Gagal menandai struk telah diproses.')
  }

  revalidatePath('/dashboard')
  return true
}
