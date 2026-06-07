// ========================================
// AWID / BURGER MINUTE - Settings API Route
// GET /api/settings - Get all users (admin + livreurs) for settings page
// PATCH /api/settings - Update credentials
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/bm/lib/auth'
import bcrypt from 'bcrypt'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole(request, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        isAvailable: true,
      },
      orderBy: [
        { role: 'asc' },
        { createdAt: 'asc' },
      ],
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('[Settings] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireRole(request, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    const body = await request.json()
    const { userId, name, phone, password } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const existing = await db.user.findUnique({ where: { id: userId } })
    if (!existing) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (phone !== undefined) updateData.phone = phone
    if (password && password.length > 0) {
      if (password.length < 3) {
        return NextResponse.json(
          { error: 'Password must be at least 3 characters' },
          { status: 400 }
        )
      }
      updateData.password = await bcrypt.hash(password, 10)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No changes provided' },
        { status: 400 }
      )
    }

    const updated = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        isAvailable: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[Settings] PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
