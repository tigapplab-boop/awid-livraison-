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
    const { phone, password, username } = body

    // Accept either "phone" or "username" as identifier
    const identifier = username || phone

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Identifiant et mot de passe requis' },
        { status: 400 }
      )
    }

    // Find user by phone OR by name (for simple username login like "admin", "livreur")
    let user = await db.user.findUnique({
      where: { phone: identifier },
    })

    // If not found by phone, try by name
    if (!user) {
      const usersByName = await db.user.findMany({
        where: { name: identifier },
      })
      if (usersByName.length === 1) {
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

    // Create JWT token
    const token = await createToken({
      userId: user.id,
      role: user.role,
      name: user.name,
    })

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isAvailable: user.isAvailable,
      },
    })
  } catch (error) {
    console.error('[Auth] Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
