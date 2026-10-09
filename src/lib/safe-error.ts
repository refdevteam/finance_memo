/**
 * Menyiapkan pesan error yang AMAN dikembalikan ke klien dari Server Action.
 *
 * Pesan error mentah dari Supabase/Postgres/LLM sering memuat detail internal:
 * nama tabel & kolom, nama policy RLS, nama constraint, host, atau pesan dari
 * provider AI. Informasi itu tidak perlu — dan tidak boleh — sampai ke browser.
 *
 * Fungsi ini tetap mencatat error aslinya di log server agar debugging tidak
 * kehilangan jejak, lalu mengembalikan pesan generik.
 *
 * CATATAN: file ini TIDAK memakai 'use server'. Jangan pindahkan fungsi ini ke
 * dalam file aksi — semua ekspor dari file 'use server' di Next.js menjadi
 * endpoint RPC publik.
 */
export function safeErrorMessage(error: unknown, fallback: string): string {
  console.error("[server-action] error:", error)
  return fallback
}
