// @ts-nocheck — Deno Edge Function: URL imports are valid in Supabase's Deno runtime.
/**
 * _shared/auth.ts — otorisasi bersama untuk semua Edge Function.
 *
 * Dua kelas pemanggil yang sah:
 *   1. "trusted"  — scheduler/internal kita, membawa CRON_SECRET.
 *   2. "user"     — pengguna akhir dengan Supabase JWT yang valid.
 *
 * Tanpa salah satunya, permintaan DITOLAK (fail-closed).
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  })
}

/** Bandingkan dua string tanpa membocorkan panjang/isi (hash dulu, lalu XOR). */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder()
  const [da, db] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ])
  const va = new Uint8Array(da)
  const vb = new Uint8Array(db)
  if (va.length !== vb.length) return false
  let diff = 0
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i]
  return diff === 0
}

function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? ""
  if (header.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(7).trim()
    return token || null
  }
  return null
}

async function matchesCronSecret(req: Request): Promise<boolean> {
  const expected = Deno.env.get("CRON_SECRET")
  if (!expected) return false

  // Header terpisah dari Authorization supaya JWT pengguna tidak pernah
  // diuji terhadap CRON_SECRET (dan sebaliknya).
  const provided = req.headers.get("x-cron-secret") ?? bearerToken(req)
  if (!provided) return false
  return await safeEqual(provided, expected)
}

/**
 * Guard untuk fungsi yang hanya boleh dipanggil scheduler / kode internal.
 * Mengembalikan `null` bila sah, atau Response error yang siap dikirim.
 *
 * Sengaja FAIL-CLOSED: bila CRON_SECRET belum di-set endpoint tetap tertutup,
 * supaya secret yang hilang tidak pernah diam-diam membuka kembali endpoint.
 */
export async function requireCronSecret(req: Request): Promise<Response | null> {
  if (!Deno.env.get("CRON_SECRET")) {
    return json({ success: false, error: "Server misconfigured: CRON_SECRET is not set." }, 503)
  }
  if (await matchesCronSecret(req)) return null
  return json({ success: false, error: "Unauthorized" }, 401)
}

export type Caller =
  | { kind: "trusted" }
  | { kind: "user"; userId: string }
  | { kind: "denied"; status: number; message: string }

/**
 * Kenali pemanggil: scheduler internal ATAU pengguna terautentikasi.
 * Dipakai oleh fungsi yang menerima panggilan dari aplikasi (mis. notifikasi).
 */
export async function resolveCaller(req: Request, supabase: any): Promise<Caller> {
  if (await matchesCronSecret(req)) return { kind: "trusted" }

  const token = bearerToken(req)
  if (!token) return { kind: "denied", status: 401, message: "Missing authorization" }

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) {
    return { kind: "denied", status: 401, message: "Invalid or expired token" }
  }
  return { kind: "user", userId: data.user.id }
}

/** Apakah `partnerId` memegang bagian pada tagihan milik `ownerId`? */
async function sharesBillOf(supabase: any, ownerId: string, partnerId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("split_bills")
    .select("id, split_bill_shares!inner(partner_user_id)", { count: "exact", head: true })
    .eq("user_id", ownerId)
    .eq("split_bill_shares.partner_user_id", partnerId)
  if (error) throw error
  return (count ?? 0) > 0
}

/**
 * Apakah `callerId` boleh mengirim notifikasi ke `targetId`?
 *
 * Diizinkan bila: diri sendiri, atau ada relasi last_bill_partners (dua arah),
 * atau mereka berbagi satu tagihan patungan (dua arah).
 *
 * Semua alur notifikasi yang ada (ajukan / lunas / batal patungan) selalu
 * menyasar partner yang berasal dari last_bill_partners — termasuk notifikasi
 * pembatalan, yang dikirim SETELAH baris split_bills terhapus, sehingga relasi
 * last_bill_partners (yang tidak ikut terhapus) tetap menjadi sandarannya.
 */
export async function canNotify(
  supabase: any,
  callerId: string,
  targetId: string,
): Promise<boolean> {
  if (!UUID_RE.test(callerId) || !UUID_RE.test(targetId)) return false
  if (callerId === targetId) return true

  for (const [owner, partner] of [
    [callerId, targetId],
    [targetId, callerId],
  ]) {
    const { count, error } = await supabase
      .from("last_bill_partners")
      .select("id", { count: "exact", head: true })
      .eq("user_id", owner)
      .eq("partner_user_id", partner)
    if (error) throw error
    if ((count ?? 0) > 0) return true
  }

  if (await sharesBillOf(supabase, callerId, targetId)) return true
  if (await sharesBillOf(supabase, targetId, callerId)) return true

  return false
}
