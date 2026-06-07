// ========================================
// AWID / BURGER MINUTE - Livreur [id] API Route
// PATCH /api/livreurs/[id] - Update livreur (ADMIN)
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/bm/lib/auth'
import bcrypt from 'bcrypt'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(request, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    const { id } = await params
    const body = await request.json()

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Livreur not found' }, { status: 404 })
    }

    if (existing.role !== 'LIVREUR') {
      return NextResponse.json({ error: 'User is not a livreur' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.phone !== undefined) updateData.phone = body.phone
    if (body.isAvailable !== undefined) updateData.isAvailable = body.isAvailable
    if (body.password) {
      updateData.password = await bcrypt.hash(body.password, 10)
    }

    const livreur = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        phone: true,
        isAvailable: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json(livreur)
  } catch (error) {
    console.error('[Livreurs/PATCH] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
