// @ts-nocheck — Deno Edge Function: URL imports are valid in Supabase's Deno runtime.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { json } from "../_shared/auth.ts"

/**
 * Hapus seluruh berkas di dalam satu prefix folder (mis. `{userId}/`).
 * `list()` dibatasi 100 baris per halaman, jadi diulang sampai habis.
 * Kegagalan di sini dicatat tapi TIDAK menggagalkan penghapusan akun —
 * data utama tetap harus hilang walau storage sedang bermasalah.
 */
async function deleteStorageTree(supabase: any, bucket: string, prefix: string) {
  try {
    const pageSize = 100
    for (let page = 1; page <= 50; page++) {
      const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: pageSize })
      if (error) throw error
      const files = (data ?? []).filter((f: any) => f.name)
      if (files.length === 0) break

      const paths = files.map((f: any) => `${prefix}/${f.name}`)
      const { error: rmError } = await supabase.storage.from(bucket).remove(paths)
      if (rmError) throw rmError

      if (files.length < pageSize) break
    }
    console.log(`[GDPR] storage cleanup done for ${prefix} in bucket ${bucket}`)
  } catch (err) {
    console.error(`[GDPR] storage cleanup failed for ${prefix}:`, err)
  }
}

// Tidak ada CORS: pemanggilnya hanya server action GDPR Next.js
// (server-to-server). endpoint ini menghapus akun, jadi jangan dibuka ke browser.

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables are missing')
    }

    // Use service role client for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the user from the authorization header (JWT)
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.toLowerCase().startsWith('bearer ') || !authHeader.slice(7).trim()) {
      return json({ success: false, error: 'Missing authorization header' }, 401)
    }

    const token = authHeader.slice(7).trim()

    // Verify the user's JWT and get their user ID
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return json({ success: false, error: 'Invalid or expired token' }, 401)
    }

    const userId = user.id

    // Hapus berkas storage milik user SEBELUM akunnya dihapus.
    // Baris di storage.objects tidak punya FK ke profiles, jadi
    // `auth.admin.deleteUser` tidak akan menyentuhnya — tanpa langkah ini
    // gambar struk tetap tersimpan setelah akun dihapus (pelanggaran
    // hak penghapusan GDPR Pasal 17).
    await deleteStorageTree(supabase, 'receipts', userId)

    // Delete user from auth.users using admin API
    // This will cascade delete all related data if RLS policies are set up correctly
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId)

    if (deleteAuthError) {
      console.error('Error deleting user from auth:', deleteAuthError)
      throw deleteAuthError
    }

    console.log(`Successfully deleted user ${userId} from auth.users`)

    return json({ success: true, message: 'User account deleted successfully' }, 200)

  } catch (err) {
    console.error('Error in delete-user-account function:', err)

    // Jangan kembalikan pesan error internal (bisa memuat detail konfigurasi).
    return json({ success: false, error: 'Failed to delete account' }, 500)
  }
})
