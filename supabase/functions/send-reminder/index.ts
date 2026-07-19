// @ts-nocheck — Deno Edge Function: URL imports are valid in Supabase's Deno runtime.
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ""
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ""

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables are missing')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    // Call the Postgres RPC function to process due reminders
    const { data: dueReminders, error: rpcError } = await supabase.rpc('process_due_reminders')

    if (rpcError) {
      console.error('Error executing process_due_reminders RPC:', rpcError)
      throw rpcError
    }

    console.log(`Successfully executed process_due_reminders. Found ${dueReminders?.length || 0} reminders due.`)

    const results = []

    if (dueReminders && dueReminders.length > 0) {
      // Initialize FCM once for all reminders in this batch
      const fcm = await initFcm()

      for (const reminder of dueReminders) {
        const emailSent = { channel: 'email', status: 'skipped' }
        const pushSent = { channel: 'push', status: 'skipped' }

        const channels = reminder.channels || {}
        const amountFormatted = reminder.amount
          ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(reminder.amount)
          : 'Tanpa nominal'

        // 1. Send Email Notification
        if (channels.email && reminder.email) {
          if (resendApiKey) {
            try {
              const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${resendApiKey}`
                },
                body: JSON.stringify({
                  from: 'fimo <notifications@fimo.id>',
                  to: [reminder.email],
                  subject: `Pengingat fimo: ${reminder.title}`,
                  html: `
                    <div style="font-family: sans-serif; padding: 20px; color: #333;">
                      <h2 style="color: #10b981;">Pengingat fimo (Finance Memo)</h2>
                      <p>Halo,</p>
                      <p>Ini adalah pengingat otomatis bahwa pengingat keuangan Anda jatuh tempo hari ini:</p>
                      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">${reminder.title}</h3>
                        <p style="margin-bottom: 5px;">Nominal: <strong>${amountFormatted}</strong></p>
                        <p style="margin-bottom: 5px;">Jatuh Tempo: <strong>${reminder.due_date}</strong></p>
                        ${reminder.notes ? `<p style="margin-bottom: 0;">Catatan: <em>${reminder.notes}</em></p>` : ''}
                      </div>
                      <p>Silakan buka aplikasi fimo untuk menyelesaikan transaksi Anda.</p>
                      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                      <p style="font-size: 11px; color: #999;">Email ini dikirim otomatis oleh sistem fimo.</p>
                    </div>
                  `
                })
              })

              if (res.ok) {
                emailSent.status = 'sent'
                console.log(`[Email] Berhasil dikirim ke ${reminder.email} untuk pengingat: ${reminder.title}`)
              } else {
                const errData = await res.json()
                emailSent.status = 'failed'
                console.error(`[Email] Gagal mengirim ke ${reminder.email}:`, errData)
              }
            } catch (err) {
              emailSent.status = 'error'
              console.error(`[Email] Error sending email to ${reminder.email}:`, err)
            }
          } else {
            emailSent.status = 'simulated'
            console.log(`[Simulasi Email] Mengirim email ke ${reminder.email} untuk tagihan "${reminder.title}" senilai ${amountFormatted}`)
          }
        }

        // 2. Send Push Notification via FCM
        if (channels.push && reminder.fcm_token) {
          const reminderType = reminder.type || 'custom'
          let encourageMsg = ''
          if (reminderType === 'bill') {
            encourageMsg = `Semangat! Menyelesaikan tagihan "${reminder.title}" ini adalah langkah nyata melindungi ketenangan pikiranmu. Semoga rezekimu selalu mengalir lancar dan dilimpahi kemudahan. Kamu pasti bisa!`
          } else if (reminderType === 'installment') {
            encourageMsg = `Satu langkah lagi untuk "${reminder.title}" demi kebebasan finansialmu. Bernapaslah dengan lega, kamu sedang berjuang hebat!`
          } else if (reminderType === 'subscription') {
            encourageMsg = `Tinjau kembali yuk, apakah langganan "${reminder.title}" ini benar-benar menghadirkan manfaat nyata di harimu? Pilih yang terbaik untuk jiwamu!`
          } else if (reminderType === 'saving') {
            encourageMsg = `Setiap tabungan kecil untuk "${reminder.title}" adalah wujud kasih sayang pada masa depanmu. Nikmati prosesnya demi ketenangan jiwamu!`
          } else {
            encourageMsg = `Langkah kecil untuk "${reminder.title}" hari ini adalah investasi berharga bagi kebahagiaanmu. Tetap semangat dan selalu jaga kesehatan mentalmu!`
          }

          let notificationBody = ''
          if (reminder.amount && reminder.amount > 0) {
            notificationBody = `Pembayaran senilai Rp ${new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(reminder.amount)} jatuh tempo. ${encourageMsg}`
          } else {
            notificationBody = `${reminder.notes || 'Pengingat jatuh tempo hari ini.'} ${encourageMsg}`
          }

          if (fcm) {
            try {
              await sendFcmPush(fcm.accessToken, fcm.projectId, {
                fcmToken: reminder.fcm_token,
                title: `Pengingat fimo: ${reminder.title}`,
                body: notificationBody,
                actionUrl: `/dashboard/reminders?manage_id=${reminder.reminder_id}`,
                icon: '/logo-circle.png',
                data: {
                  reminder_id: String(reminder.reminder_id),
                  type: 'reminder',
                  category: reminderType,
                  title: reminder.title,
                },
              })
              pushSent.status = 'sent'
              console.log(`[FCM Push] Berhasil dikirim ke token ${reminder.fcm_token.substring(0, 15)}...`)
            } catch (err) {
              pushSent.status = 'failed'
              pushSent.error = err instanceof Error ? err.message : String(err)
              console.error(`[FCM Push] Gagal mengirim ke token ${reminder.fcm_token.substring(0, 15)}... :`, err)
            }
          } else {
            pushSent.status = 'simulated'
            console.log(`[Simulasi Push] Mengirim push notification ke token ${reminder.fcm_token.substring(0, 15)}... untuk tagihan "${reminder.title}" senilai ${amountFormatted}`)
          }
        }

        results.push({
          id: reminder.reminder_id,
          title: reminder.title,
          email: emailSent,
          push: pushSent
        })
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Processed due reminders successfully.`,
      processed: results,
      diagnostics: {
        fcm_env_exists: !!Deno.env.get('FIREBASE_SERVICE_ACCOUNT'),
        resend_env_exists: !!resendApiKey,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err) {
    console.error('Error in send-reminder edge function:', err)
    let errorMessage = 'Unknown error'
    if (err instanceof Error) {
      errorMessage = err.message
    } else if (typeof err === 'object' && err !== null) {
      try {
        errorMessage = JSON.stringify(err)
      } catch (_) {
        errorMessage = String(err)
      }
    } else {
      errorMessage = String(err)
    }

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
