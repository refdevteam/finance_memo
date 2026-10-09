// @ts-nocheck â€” Deno Edge Function: URL imports are valid in Supabase's Deno runtime.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { initFcm, sendFcmPush } from "../_shared/fcm.ts"
import { withRetry } from "../_shared/retry.ts"
import { json, requireCronSecret } from "../_shared/auth.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }

  // Fungsi cron: hanya scheduler internal yang diizinkan. Tanpa CRON_SECRET
  // yang cocok -> 401 (fail-closed), supaya RPC yang MENTRANSASKAN data tidak
  // bisa dipicu berulang oleh pihak luar.
  const denied = await requireCronSecret(req)
  if (denied) return denied

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables are missing')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Process due recurring templates
    const { data: processed, error: rpcError } = await supabase.rpc('process_due_recurring_templates')

    if (rpcError) {
      console.error('Error executing process_due_recurring_templates:', rpcError)
      throw rpcError
    }

    console.log(`[Recurring] process_due_recurring_templates processed ${processed?.length ?? 0} templates.`)

    // Send FCM push for each processed recurring transaction
    const fcm = await initFcm()
    const pushResults = []

    if (processed && processed.length > 0) {
      for (const item of processed) {
        const { user_id, fcm_token, title: itemTitle, amount, type } = item

        if (!fcm_token) {
          pushResults.push({ user_id, push: 'skipped_no_token' })
          continue
        }

        const isIncome = type === 'income'
        const amountFormatted = amount
          ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
          : ''

        const pushTitle = isIncome
          ? `ðŸ’° Pemasukan Rutin: ${itemTitle}`
          : `ðŸ“‹ Pengeluaran Rutin: ${itemTitle}`

        const pushBody = isIncome
          ? `${amountFormatted ? `Pemasukan ${amountFormatted}` : 'Transaksi'} rutin "${itemTitle}" berhasil dicatat. Semangat mengelola keuanganmu!`
          : `${amountFormatted ? `Pengeluaran ${amountFormatted}` : 'Transaksi'} rutin "${itemTitle}" telah dijadwalkan. Pastikan dananya tersedia ya!`

        if (fcm) {
          try {
            await withRetry(() => sendFcmPush(fcm.accessToken, fcm.projectId, {
              fcmToken: fcm_token,
              title: pushTitle,
              body: pushBody,
              actionUrl: '/dashboard/transactions',
              icon: '/logo-circle.png',
              data: {
                type: 'recurring',
                transaction_type: String(type),
                amount: String(amount ?? 0),
              },
            }), 'sendFcmPush-recurring', { maxAttempts: 3 })
            pushResults.push({ user_id, push: 'sent' })
            console.log(`[Recurring] FCM push sent to user ${user_id} for "${itemTitle}"`)
          } catch (err) {
            pushResults.push({ user_id, push: 'failed', error: String(err) })
            console.error(`[Recurring] FCM push failed for user ${user_id}:`, err)
          }
        } else {
          pushResults.push({ user_id, push: 'skipped_no_fcm_config' })
          console.log(`[Recurring] Simulated push to user ${user_id}: ${pushTitle}`)
        }
      }
    }

    return json({
      success: true,
      message: 'Processed due recurring templates successfully.',
      processed_count: processed?.length ?? 0,
      push_results: pushResults,
    }, 200)

  } catch (err) {
    console.error('Error in process-recurring function:', err)
    return json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    }, 500)
  }
})

