// @ts-nocheck — Deno Edge Function: URL imports are valid in Supabase's Deno runtime.
/**
 * send-fcm-notification — General-purpose FCM push dispatcher
 *
 * Dapat dipanggil dari:
 * - Database trigger (via pg_net extension)
 * - Aplikasi Next.js (server action dengan service role key)
 * - Edge Functions lain (internal)
 *
 * Body request (JSON):
 * {
 *   "user_id": "uuid",         // opsional — lookup FCM token dari profiles
 *   "fcm_token": "string",     // opsional — langsung kirim ke token ini
 *   "title": "string",
 *   "body": "string",
 *   "type": "reminder|budget_alert|recurring|system|ai_insight",
 *   "action_url": "/dashboard/...",   // opsional
 *   "data": { "key": "value" },       // opsional extra payload
 *   "save_to_db": true                // default true — simpan ke tabel notifications
 * }
 *
 * Salah satu dari user_id atau fcm_token HARUS ada.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { initFcm, sendFcmPush } from "../_shared/fcm.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const body = await req.json()
    const {
      user_id,
      fcm_token: directToken,
      title,
      body: notifBody,
      type = 'system',
      action_url,
      data = {},
      save_to_db = true,
    } = body

    if (!title || !notifBody) {
      return new Response(JSON.stringify({ success: false, error: 'title and body are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (!user_id && !directToken) {
      return new Response(JSON.stringify({ success: false, error: 'user_id or fcm_token is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Resolve FCM token from user_id if not provided directly
    let fcmToken: string | null = directToken ?? null
    let resolvedUserId: string | null = user_id ?? null

    if (!fcmToken && user_id) {
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('fcm_token')
        .eq('id', user_id)
        .single()

      if (profileErr) {
        console.error('[FCM Dispatch] Failed to fetch user profile:', profileErr)
        throw new Error(`Failed to fetch user profile: ${profileErr.message}`)
      }

      fcmToken = profile?.fcm_token ?? null
    }

    // Save notification to database
    if (save_to_db && resolvedUserId) {
      const { error: insertErr } = await supabase
        .from('notifications')
        .insert({
          user_id: resolvedUserId,
          title,
          body: notifBody,
          type,
          action_url: action_url ?? null,
          is_read: false,
        })

      if (insertErr) {
        console.error('[FCM Dispatch] Failed to save notification to DB:', insertErr)
        // Non-fatal — still attempt push delivery
      } else {
        console.log(`[FCM Dispatch] Notification saved to DB for user ${resolvedUserId}`)
      }
    }

    // Send FCM push if token is available
    let pushResult: 'sent' | 'skipped_no_token' | 'skipped_no_fcm_config' | 'failed' = 'skipped_no_token'
    let pushError: string | null = null

    if (fcmToken) {
      const fcm = await initFcm()
      if (fcm) {
        try {
          await sendFcmPush(fcm.accessToken, fcm.projectId, {
            fcmToken,
            title,
            body: notifBody,
            actionUrl: action_url,
            icon: '/logo-circle.png',
            data: {
              type,
              ...Object.fromEntries(
                Object.entries(data).map(([k, v]) => [k, String(v)])
              ),
            },
          })
          pushResult = 'sent'
          console.log(`[FCM Dispatch] Push sent to token ${fcmToken.substring(0, 20)}...`)
        } catch (err) {
          pushResult = 'failed'
          pushError = err instanceof Error ? err.message : String(err)
          console.error('[FCM Dispatch] Push failed:', err)
        }
      } else {
        pushResult = 'skipped_no_fcm_config'
        console.warn('[FCM Dispatch] FCM not initialized — FIREBASE_SERVICE_ACCOUNT secret missing')
      }
    }

    return new Response(JSON.stringify({
      success: true,
      push: pushResult,
      push_error: pushError,
      db_saved: save_to_db && !!resolvedUserId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err) {
    console.error('[send-fcm-notification] Unhandled error:', err)
    return new Response(JSON.stringify({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
