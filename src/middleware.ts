import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check maintenance mode for client-facing routes
  // NOTE: On utilise l'URL interne absolue pour éviter le fetch failed en Edge Runtime
  if (
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/livreur') &&
    !pathname.startsWith('/maintenance') &&
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/favicon') &&
    !pathname.startsWith('/login') &&
    pathname !== '/sw.js' &&
    pathname !== '/manifest.json'
  ) {
    try {
      // Utiliser l'URL interne du container pour éviter fetch failed en Edge Runtime
      const internalUrl = process.env.INTERNAL_API_URL || `http://localhost:3000`
      const maintenanceRes = await fetch(
        `${internalUrl}/api/settings/maintenance`,
        { 
          cache: 'no-store',
          headers: { 'x-middleware-internal': '1' },
          signal: AbortSignal.timeout(2000), // timeout 2s max
        }
      )
      
      if (maintenanceRes.ok) {
        const data = await maintenanceRes.json()
        if (data.enabled === true) {
          return NextResponse.redirect(new URL('/maintenance', request.url))
        }
      }
    } catch {
      // Si le fetch échoue (Edge Runtime, réseau), on laisse passer sans bloquer
    }
  }

  if (pathname.startsWith('/admin') || pathname.startsWith('/livreur')) {
    // Ignore login pages
    if (pathname === '/admin/login' || pathname === '/livreur/login') {
      return NextResponse.next()
    }

    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
      const JWT_SECRET_RAW = process.env.JWT_SECRET
      if (!JWT_SECRET_RAW || JWT_SECRET_RAW.length < 32) {
        throw new Error('FATAL: JWT_SECRET must be set and >= 32 characters')
      }
      const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_RAW)
      
      const { payload } = await jwtVerify(token, JWT_SECRET)
      
      if (pathname.startsWith('/admin')) {
        if (payload.role !== 'ADMIN') {
          return NextResponse.redirect(new URL('/login', request.url))
        }
      }

      if (pathname.startsWith('/livreur')) {
        if (payload.role !== 'LIVREUR' && payload.role !== 'ADMIN') {
          return NextResponse.redirect(new URL('/login', request.url))
        }
      }

      return NextResponse.next()
    } catch {
      // Token invalide → vider le cookie et rediriger vers login
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.set('auth_token', '', { maxAge: 0, path: '/' })
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
