// ========================================
// AWID / BURGER MINUTE - Online Livreurs API
// GET /api/livreurs/online - Get online/available livreurs
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest, type JwtPayload } from '@/bm/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) return authResult
    const user = authResult as JwtPayload

    // Seulement pour les admins
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Un livreur est considéré "en ligne" si lastSeenAt < 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)

    const livreurs = await db.user.findMany({
      where: {
        role: 'LIVREUR',
      },
      select: {
        id: true,
        name: true,
        phone: true,
        isAvailable: true,
        lastSeenAt: true,
        availabilitySchedule: true,
        _count: {
          select: {
            ordersAssigned: {
              where: {
                status: {
                  in: ['CONFIRMED', 'PREPARING', 'READY'],
                },
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    const livreursWithStatus = livreurs.map(livreur => ({
      ...livreur,
      isOnline: livreur.lastSeenAt ? livreur.lastSeenAt > twoMinutesAgo : false,
      availabilitySchedule: livreur.availabilitySchedule 
        ? JSON.parse(livreur.availabilitySchedule) 
        : null,
      activeOrders: livreur._count.ordersAssigned,
    }))

    return NextResponse.json(livreursWithStatus)
  } catch (error) {
    console.error('[Online Livreurs] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
