// ========================================
// AWID / BURGER MINUTE - Livreur Availability API
// GET  /api/livreurs/[id]/availability  → relit isAvailable + availabilitySchedule
// PUT  /api/livreurs/[id]/availability
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest, type JwtPayload } from '@/bm/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) return authResult
    const user = authResult as JwtPayload

    const { id } = await params

    // Vérifier que c'est le livreur lui-même ou un admin
    if (user.userId !== id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const currentUser = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        isAvailable: true,
        availabilitySchedule: true,
        lastSeenAt: true,
      },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'Livreur introuvable' }, { status: 404 })
    }

    return NextResponse.json({
      ...currentUser,
      availabilitySchedule: currentUser.availabilitySchedule
        ? JSON.parse(currentUser.availabilitySchedule)
        : null,
    })
  } catch (error) {
    console.error('[Livreur Availability] GET Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) return authResult
    const user = authResult as JwtPayload

    const { id } = await params
    const body = await request.json()
    const { isAvailable, availabilitySchedule } = body

    // Vérifier que c'est le livreur lui-même ou un admin
    if (user.userId !== id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Mettre à jour la disponibilité
    const updatedUser = await db.user.update({
      where: { id },
      data: {
        isAvailable: isAvailable !== undefined ? isAvailable : undefined,
        availabilitySchedule: availabilitySchedule !== undefined 
          ? JSON.stringify(availabilitySchedule) 
          : undefined,
        lastSeenAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        isAvailable: true,
        availabilitySchedule: true,
        lastSeenAt: true,
      },
    })

    // Émettre via WebSocket pour mise à jour temps réel
    try {
      const { emitToRoom } = await import('@/bm/lib/socket')
      await emitToRoom('livreur:status', 'admin', {
        livreurId: id,
        isAvailable: updatedUser.isAvailable,
        lastSeenAt: updatedUser.lastSeenAt,
      })
    } catch (err) {
      console.error('[Livreur Availability] Socket emit error:', err)
    }

    return NextResponse.json({
      ...updatedUser,
      availabilitySchedule: updatedUser.availabilitySchedule 
        ? JSON.parse(updatedUser.availabilitySchedule) 
        : null,
    })
  } catch (error) {
    console.error('[Livreur Availability] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
