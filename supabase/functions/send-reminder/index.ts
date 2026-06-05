// @ts-nocheck — Deno Edge Function: URL imports are valid in Supabase's Deno runtime.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
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

    // Call the Postgres RPC function to process due reminders
    const { data: dueReminders, error: rpcError } = await supabase.rpc('process_due_reminders')

    if (rpcError) {
      console.error('Error executing process_due_reminders RPC:', rpcError)
      throw rpcError
    }

    console.log(`Successfully executed process_due_reminders. Found ${dueReminders?.length || 0} reminders due.`)

    const results = []

    if (dueReminders && dueReminders.length > 0) {
      const resendApiKey = Deno.env.get('RESEND_API_KEY')
      
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
            // Local fallback simulation
            emailSent.status = 'simulated'
            console.log(`[Simulasi Email] Mengirim email ke ${reminder.email} untuk tagihan "${reminder.title}" senilai ${amountFormatted}`)
          }
        }

        // 2. Send Push Notification
        if (channels.push && reminder.fcm_token) {
          // Firebase FCM simulation fallback
          pushSent.status = 'simulated'
          console.log(`[Simulasi Push] Mengirim push notification ke token ${reminder.fcm_token.substring(0, 15)}... untuk tagihan "${reminder.title}" senilai ${amountFormatted}`)
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
      processed: results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err) {
    console.error('Error in send-reminder edge function:', err)
    return new Response(JSON.stringify({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
