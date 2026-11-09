import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // La dirección principal abre directamente el login (o el panel si ya hay sesión)
  if (pathname === '/') return NextResponse.redirect(new URL(user ? '/app' : '/login', request.url))

  // Pública: solo el login
  const esPublica = pathname.startsWith('/login')

  if (!user && !esPublica) return NextResponse.redirect(new URL('/login', request.url))
  if (user && pathname.startsWith('/login')) return NextResponse.redirect(new URL('/app', request.url))
  // Rutas de la versión anterior → panel nuevo
  if (user && /^\/(dashboard|productos|ordenes|catalogo)(\/|$)/.test(pathname)) return NextResponse.redirect(new URL('/app', request.url))

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|panel/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|css|mp4)$).*)'],
}
