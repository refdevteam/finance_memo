// @ts-nocheck — Deno Edge Function: URL imports are valid in Supabase's Deno runtime.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getFcmAccessToken(serviceAccount: any): Promise<string> {
  const email = serviceAccount.client_email;
  const privateKeyPem = serviceAccount.private_key;
  
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKeyPem
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s/g, "");
  
  const binaryDerString = atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSASHA256",
      hash: { name: "SHA-256" },
    },
    false,
    ["sign"]
  );

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encode = (obj: any) => btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const stringToSign = `${encode(header)}.${encode(claimSet)}`;
  
  const signatureBuffer = await crypto.subtle.sign(
    "RSASHA256",
    key,
    new TextEncoder().encode(stringToSign)
  );

  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const assertion = `${stringToSign}.${signature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to get OAuth token: ${response.statusText} - ${errorBody}`);
  }

  const tokenData = await response.json();
  return tokenData.access_token;
}

async function sendFcmNotification(
  accessToken: string,
  projectId: string,
  fcmToken: string,
  title: string,
  body: string,
  metadata: any = {}
) {
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      message: {
        token: fcmToken,
        notification: {
          title,
          body,
        },
        data: metadata,
        webpush: {
          headers: {
            Urgency: "high",
          },
          notification: {
            body,
            icon: "/logo-circle.png",
            click_action: "/dashboard/reminders",
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`FCM send failed: ${response.statusText} - ${errText}`);
  }

  const resJson = await response.json();
  return resJson;
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

    // Initialize FCM settings variables in outer try scope
    let fcmAccessToken: string | null = null
    let fcmProjectId = ''

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
      const fcmServiceAccountStr = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
      
      if (fcmServiceAccountStr) {
        try {
          const serviceAccount = JSON.parse(fcmServiceAccountStr)
          fcmProjectId = serviceAccount.project_id
          fcmAccessToken = await getFcmAccessToken(serviceAccount)
          console.log('[FCM] Successfully generated OAuth access token')
        } catch (err) {
          console.error('[FCM] Failed to initialize Firebase service account or generate token:', err)
        }
      } else {
        console.log('[FCM] FIREBASE_SERVICE_ACCOUNT is missing in environment. Falling back to simulation.')
      }

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

        // 2. Send Push Notification
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

          if (fcmAccessToken && fcmProjectId) {
            try {
              await sendFcmNotification(
                fcmAccessToken,
                fcmProjectId,
                reminder.fcm_token,
                `Pengingat fimo: ${reminder.title}`,
                notificationBody,
                {
                  reminder_id: String(reminder.reminder_id),
                  type: 'reminder',
                  category: reminderType,
                  title: reminder.title,
                  action_url: `/dashboard/reminders?manage_id=${reminder.reminder_id}`
                }
              )
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
        fcm_project_id: fcmProjectId || null,
        fcm_token_success: !!fcmAccessToken
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
