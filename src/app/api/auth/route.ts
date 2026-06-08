// ========================================
// AWID / BURGER MINUTE - Auth API Route
// POST /api/auth - Login with phone & password
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createToken } from '@/bm/lib/auth'
import { rateLimit } from '@/bm/lib/rate-limit'
import bcrypt from 'bcrypt'

export async function POST(request: NextRequest) {
  // Rate limit: 10 requests per minute per IP
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'
  const rateResult = rateLimit(clientIp, {
    maxRequests: 10,
    windowMs: 60_000,
    key: 'auth',
  })
  if (!rateResult.allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateResult.resetAt - Date.now()) / 1000)),
        },
      }
    )
  }

  try {
    const body = await request.json()
    const { username, password, newPassword } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Identifiant et mot de passe requis' },
        { status: 400 }
      )
    }

    let user
    // Determine if it's a phone number or a username (livreur/admin)
    const isPhone = /^0(5|6|7)\d{8}$/.test(username)

    if (isPhone) {
      user = await db.user.findUnique({ where: { phone: username } })
    } else {
      // Some generic accounts might use simple usernames like "livreur" instead of phone
      // We stored it in phone column for simplicity in the generic model
      user = await db.user.findUnique({ where: { phone: username } })
      
      // Fallback: search by name if not found by phone (for generic accounts)
      if (!user) {
        const usersByName = await db.user.findMany({ 
          where: { name: username },
          take: 1
        })
        user = usersByName[0]
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Identifiants invalides' },
        { status: 401 }
      )
    }

    // Compare password
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Identifiants invalides' },
        { status: 401 }
      )
    }

    if (user.mustChangePassword) {
      if (!newPassword) {
        return NextResponse.json({ 
          error: 'Vous devez changer votre mot de passe', 
          mustChangePassword: true 
        }, { status: 403 })
      }
      
      // Change the password
      const hashed = await bcrypt.hash(newPassword, 10)
      user = await db.user.update({
        where: { id: user.id },
        data: { password: hashed, mustChangePassword: false }
      })
    }

    // Create JWT token
    const token = await createToken({
      userId: user.id,
      role: user.role,
      name: user.name,
    })

    const response = NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isAvailable: user.isAvailable,
      },
    })

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // relax a bit for PWA navigation
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[Auth] Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
