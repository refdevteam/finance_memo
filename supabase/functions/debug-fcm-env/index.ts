// @ts-nocheck
/**
 * debug-fcm-env — alat bantu operator: memastikan FIREBASE_SERVICE_ACCOUNT
 * terbaca dan berformat JSON yang benar.
 *
 * Riwayat keamanan:
 *   • Sebelumnya dibuat langsung dari Dashboard (09-10-2026) dengan
 *     verify_jwt = false dan TANPA pemeriksaan apa pun, sehingga bisa
 *     dipanggil siapa saja, lalu membocorkan:
 *       - 50 karakter pertama JSON service account
 *       - 40 karakter pertama kunci privat (materi kunci)
 *       - client_email & project_id
 *   • Kini fungsi ini ada di repo (bisa direview & direproduksi),
 *     dijaga oleh CRON_SECRET, dan TIDAK lagi mengembalikan potongan
 *     materi rahasia apa pun. Untuk debugging, "apakah terbaca &
 *     formatnya valid" sudah cukup.
 *
 * Pemakaian:
 *   curl -X POST https://<ref>.supabase.co/functions/v1/debug-fcm-env \
 *     -H 'x-cron-secret: <CRON_SECRET>' -H 'apikey: <ANON_KEY>' -d '{}'
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { json, requireCronSecret } from "../_shared/auth.ts"

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 })
  }

  // Alat operator: hanya pemegang CRON_SECRET yang boleh memanggil.
  const denied = await requireCronSecret(req)
  if (denied) return denied

  const raw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')

  if (!raw) {
    return json({
      found: false,
      message: 'FIREBASE_SERVICE_ACCOUNT is NOT set or empty',
    }, 200)
  }

  let parsed = null
  let parseError = null
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    // Hanya pesan error generik; jangan teruskan teks mentah bila berisi
    // sebagian isi variabel.
    parseError = 'invalid JSON'
  }

  // Sengaja TIDAK menyertakan: substring isi variabel, awal kunci privat,
  // private_key_id, atau nilai apa pun dari parsed.private_key.
  return json({
    found: true,
    length: raw.length,
    parse_ok: parsed !== null,
    parse_error: parseError,
    project_id: parsed?.project_id ?? null,
    client_email: parsed?.client_email ?? null,
    has_private_key: typeof parsed?.private_key === 'string' && parsed.private_key.length > 0,
    private_key_pem_format: parsed?.private_key?.startsWith('-----BEGIN') ?? false,
  }, 200)
})
