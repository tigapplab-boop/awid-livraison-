import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check maintenance mode for client-facing routes
  if (
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/api/admin') &&
    !pathname.startsWith('/livreur') &&
    !pathname.startsWith('/maintenance') &&
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/favicon')
  ) {
    try {
      const maintenanceRes = await fetch(
        new URL('/api/settings/maintenance', request.url).toString(),
        { cache: 'no-store' }
      )
      
      if (maintenanceRes.ok) {
        const data = await maintenanceRes.json()
        if (data.enabled === true) {
          return NextResponse.redirect(new URL('/maintenance', request.url))
        }
      }
    } catch (error) {
      console.error('[Middleware] Maintenance check error:', error)
    }
  }

  if (pathname.startsWith('/admin') || pathname.startsWith('/livreur')) {
    // Ignore login pages
    if (pathname === '/admin/login' || pathname === '/livreur/login') {
      return NextResponse.next()
    }

    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.redirect(new URL(pathname.startsWith('/admin') ? '/admin/login' : '/livreur/login', request.url))
    }

    try {
      const JWT_SECRET_RAW = process.env.JWT_SECRET
      if (!JWT_SECRET_RAW || JWT_SECRET_RAW.length < 32) {
        throw new Error('FATAL: JWT_SECRET must be set and >= 32 characters')
      }
      const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_RAW)
      
      const { payload } = await jwtVerify(token, JWT_SECRET)
      
      // Admin verification
      if (pathname.startsWith('/admin')) {
        if (payload.role !== 'ADMIN') {
          return NextResponse.redirect(new URL('/', request.url))
        }
      }

      // Livreur verification (admin can also access livreur pages for testing)
      if (pathname.startsWith('/livreur')) {
        if (payload.role !== 'LIVREUR' && payload.role !== 'ADMIN') {
          return NextResponse.redirect(new URL('/', request.url))
        }
      }

      return NextResponse.next()
    } catch (err) {
      return NextResponse.redirect(new URL(pathname.startsWith('/admin') ? '/admin/login' : '/livreur/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  // Avant : le matcher ne couvrait que /admin/* et /livreur/*, donc le code de
  // vérification du mode maintenance (destiné aux pages clientes) ne s'exécutait
  // jamais. Corrigé : le middleware tourne maintenant sur toutes les pages sauf
  // les routes API, les fichiers Next internes et les favicons.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
