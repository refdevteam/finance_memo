import type { SupabaseClient } from '@supabase/supabase-js'

type RpcCapable = Pick<SupabaseClient, 'rpc'>

/**
 * Penghitung rate limit bersama (disimpan di Postgres), sehingga tetap
 * berlaku antar-instance serverless — berbeda dengan Map di memori proses.
 *
 * Gagal-terbuka: bila RPC bermasalah, permintaan diizinkan dan error dicatat.
 * Memblokir pengguna sah karena gangguan infrastruktur lebih buruk daripada
 * melewatkan satu permintaan.
 */
export async function consumeRateLimit(
  supabase: RpcCapable,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const { data, error } = await supabase.rpc('consume_rate_limit', {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })

  if (error) {
    console.error('[rate-limit] RPC gagal:', error.message)
    return true
  }

  return data === true
}

/**
 * IP pemanggil di belakang proxy Vercel. `x-forwarded-for` bisa berisi
 * rantai; entri pertama adalah klien.
 */
export function clientIp(input: { get(name: string): string | null }): string {
  const forwarded = input.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]
    if (first) return first.trim()
  }
  return input.get('x-real-ip') ?? 'unknown'
}
