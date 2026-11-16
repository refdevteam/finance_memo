import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

/**
 * CSP dengan nonce per request.
 *
 * Header CSP tidak lagi dipasang di `next.config.mjs` karena nilainya harus
 * berubah pada setiap request. Nonce disisipkan ke request header (bukan hanya
 * response) supaya Next menyematkannya ke seluruh `<script>` yang dirender.
 *
 * `'strict-dynamic'` membuat skrip yang sudah dipercaya (bundle Next) boleh
 * memuat skrip lain tanpa perlu didaftarkan, sehingga `next/script` dan skrip
 * Turnstile yang dibuat lewat `document.createElement` tetap berjalan.
 * Daftar host tetap dipertahankan sebagai cadangan untuk browser lama yang
 * belum mengenal `'strict-dynamic'`.
 */
function buildCsp(nonce: string, isProd: boolean) {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    "https://accounts.google.com",
    "https://apis.google.com",
    "https://www.gstatic.com",
    "https://challenges.cloudflare.com",
  ]
  // Webpack/React Refresh di `next dev` memakai eval.
  if (!isProd) scriptSrc.push("'unsafe-eval'")

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    // Atribut style React (style={{...}}) tidak bisa diberi nonce, jadi
    // 'unsafe-inline' pada style-src tetap diperlukan.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co https://*.googleapis.com https://fcm.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://accounts.google.com https://challenges.cloudflare.com wss://*.supabase.co",
    "frame-src https://accounts.google.com https://content.googleapis.com https://challenges.cloudflare.com",
    // Service worker PWA (/firebase-messaging-sw.js) didaftarkan dari halaman;
    // tanpa directive ini, worker-src mewarisi script-src yang memakai
    // 'strict-dynamic' sehingga 'self' diabaikan.
    "worker-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ]
  if (isProd) directives.push("upgrade-insecure-requests")

  return directives.join("; ")
}

export async function middleware(request: NextRequest) {
  const isProd = process.env.NODE_ENV === "production"
  const nonce = crypto.randomUUID().replace(/-/g, "")
  const csp = buildCsp(nonce, isProd)

  const requestHeaders = new Headers()
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("Content-Security-Policy", csp)

  const { nextUrl } = request
  const { response: supabaseResponse, user } = await updateSession(
    request,
    requestHeaders
  )

  const applyCsp = <T extends NextResponse>(response: T) => {
    response.headers.set("Content-Security-Policy", csp)
    return response
  }

  const redirectTo = (pathname: string) => {
    const redirectResponse = NextResponse.redirect(new URL(pathname, request.url))
    // Jangan buang cookie hasil refresh sesi saat mengalihkan.
    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => redirectResponse.cookies.set(cookie))
    return applyCsp(redirectResponse)
  }

  const isDashboard = nextUrl.pathname.startsWith("/dashboard")
  const isAuth = nextUrl.pathname.startsWith("/auth")

  if (isDashboard && !user) {
    return redirectTo("/auth/login")
  }

  if (isAuth && user && !nextUrl.pathname.startsWith("/auth/callback")) {
    return redirectTo("/dashboard")
  }

  return applyCsp(supabaseResponse)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
