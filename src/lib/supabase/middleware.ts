import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Menyegarkan sesi Supabase dan mengembalikan respons yang membawa cookie
 * hasil refresh.
 *
 * `extraRequestHeaders` dipakai middleware untuk menitipkan nonce/CSP ke
 * request yang diteruskan ke App Router. Next hanya mau menyematkan nonce ke
 * setiap `<script>` bila header `Content-Security-Policy` ikut terkirim di
 * request (lihat get-script-nonce-from-header di Next).
 */
export async function updateSession(
  request: NextRequest,
  extraRequestHeaders?: Headers
) {
  const buildResponse = () => {
    if (!extraRequestHeaders) {
      return NextResponse.next({ request })
    }

    // Salin ulang dari request setiap kali supaya cookie yang baru diset
    // (lewat request.cookies.set di bawah) ikut terbawa.
    const headers = new Headers(request.headers)
    extraRequestHeaders.forEach((value, key) => headers.set(key, value))
    return NextResponse.next({ request: { headers } })
  }

  let supabaseResponse = buildResponse()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = buildResponse()
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // refreshing the auth token and get user
  const { data: { user } } = await supabase.auth.getUser()

  return { response: supabaseResponse, user }
}
