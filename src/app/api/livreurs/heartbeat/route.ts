// ========================================
// AWID / BURGER MINUTE - Livreur Heartbeat API
// POST /api/livreurs/heartbeat - Update last seen timestamp
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest, type JwtPayload } from '@/bm/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) return authResult
    const user = authResult as JwtPayload

    // Seulement pour les livreurs
    if (user.role !== 'LIVREUR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Mettre à jour lastSeenAt
    await db.user.update({
      where: { id: user.userId },
      data: { lastSeenAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Livreur Heartbeat] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
