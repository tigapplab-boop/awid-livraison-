// ========================================
// AWID / BURGER MINUTE - Zone [id] API Route
// PATCH /api/zones/[id] - Update zone (ADMIN)
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/bm/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(request, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    const { id } = await params
    const body = await request.json()

    const existing = await db.deliveryZone.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.dayFee !== undefined) updateData.dayFee = body.dayFee
    if (body.nightFee !== undefined) updateData.nightFee = body.nightFee
    if (body.startNight !== undefined) updateData.startNight = body.startNight
    if (body.endNight !== undefined) updateData.endNight = body.endNight
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    const zone = await db.deliveryZone.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(zone)
  } catch (error) {
    console.error('[Zones/PATCH] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
