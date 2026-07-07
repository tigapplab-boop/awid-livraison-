// ========================================
// AWID / BURGER MINUTE - Session Verification API
// Vérifie la validité du cookie de session sans nécessiter de token Bearer
// ========================================

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/bm/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/session
 * Vérifie si l'utilisateur a une session valide via le cookie auth_token
 * Renvoie les informations de l'utilisateur si authentifié
 */
export async function GET() {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get('auth_token')

    if (!authToken?.value) {
      return NextResponse.json({ authenticated: false }, { status: 200 })
    }

    // Vérifier la validité du token
    const payload = await verifyToken(authToken.value)

    if (!payload) {
      return NextResponse.json({ authenticated: false }, { status: 200 })
    }

    // Session valide - renvoyer les informations de l'utilisateur
    return NextResponse.json({
      authenticated: true,
      user: {
        id: payload.userId,
        name: payload.name,
        role: payload.role,
      },
      token: authToken.value, // Renvoyer le token pour le restaurer dans localStorage
    })
  } catch (error) {
    console.error('[Session] Error:', error)
    return NextResponse.json({ authenticated: false }, { status: 200 })
  }
}
