/**
 * Next 16 renamed middleware.ts to proxy.ts, and the loader reads an export
 * named `proxy` (or a default). This refreshes the Supabase session cookie and
 * bounces unauthenticated visitors to /login.
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  // getClaims() verifies the JWT locally when the project is on asymmetric
  // signing keys, and falls back to a network call otherwise. Either way, a
  // failure here must fail CLOSED rather than 500 the authenticated area.
  let authenticated = false
  try {
    const { data } = await supabase.auth.getClaims()
    authenticated = Boolean(data?.claims)
  } catch {
    authenticated = false
  }

  if (!authenticated) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

// Only the authenticated area. /login, /, static assets and _next are untouched,
// which is what keeps this from being a redirect loop.
export const config = {
  matcher: ['/routes/:path*'],
}
