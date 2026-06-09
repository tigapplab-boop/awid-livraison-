import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

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
  matcher: ['/admin/:path*', '/livreur/:path*'],
}
