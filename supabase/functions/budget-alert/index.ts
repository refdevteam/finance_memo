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

  // Fungsi cron: hanya scheduler internal yang diizinkan (fail-closed).
  const denied = await requireCronSecret(req)
  if (denied) return denied

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables are missing')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Call the Postgres RPC function check_budget_alerts()
    // This RPC inserts rows into `notifications` table and returns alert details
    const { data: alerts, error: rpcError } = await supabase.rpc('check_budget_alerts')

    if (rpcError) {
      console.error('Error executing check_budget_alerts:', rpcError)
      throw rpcError
    }

    console.log(`[Budget Alert] check_budget_alerts returned ${alerts?.length ?? 0} alerts.`)

    // Send FCM push for each alert that has an fcm_token
    const fcm = await initFcm()
    const pushResults = []

    if (alerts && alerts.length > 0) {
      for (const alert of alerts) {
        const { user_id, fcm_token, category_name, percentage, budget_limit } = alert

        if (!fcm_token) {
          console.log(`[Budget Alert] User ${user_id} has no FCM token â€” skip push.`)
          pushResults.push({ user_id, push: 'skipped_no_token' })
          continue
        }

        const isOver = percentage >= 100
        const title = isOver
          ? `âš ï¸ Anggaran "${category_name}" Terlampaui!`
          : `âš¡ Anggaran "${category_name}" Hampir Habis`

        const body = isOver
          ? `Kamu sudah melampaui batas anggaran untuk kategori "${category_name}". Tinjau pengeluaranmu agar keuangan tetap sehat.`
          : `Penggunaan anggaran "${category_name}" sudah mencapai ${Math.round(percentage)}%. Sisakan sebagian untuk akhir bulan ya!`

        if (fcm) {
          try {
            await withRetry(() => sendFcmPush(fcm.accessToken, fcm.projectId, {
              fcmToken: fcm_token,
              title,
              body,
              actionUrl: '/dashboard/budgets',
              icon: '/logo-circle.png',
              data: {
                type: 'budget_alert',
                category_name: String(category_name),
                percentage: String(Math.round(percentage)),
              },
            }), 'sendFcmPush-budget', { maxAttempts: 3 })
            pushResults.push({ user_id, push: 'sent' })
            console.log(`[Budget Alert] FCM push sent to user ${user_id} (${Math.round(percentage)}% used)`)
          } catch (err) {
            pushResults.push({ user_id, push: 'failed', error: String(err) })
            console.error(`[Budget Alert] FCM push failed for user ${user_id}:`, err)
          }
        } else {
          pushResults.push({ user_id, push: 'skipped_no_fcm_config' })
          console.log(`[Budget Alert] Simulated push to user ${user_id}: ${title}`)
        }
      }
    }

    return json({
      success: true,
      message: 'Budget alerts checked successfully.',
      alerts_found: alerts?.length ?? 0,
      push_results: pushResults,
    }, 200)

  } catch (err) {
    console.error('Error in budget-alert function:', err)
    return json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    }, 500)
  }
})

