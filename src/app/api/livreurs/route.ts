// ========================================
// AWID / BURGER MINUTE - Livreurs API Route
// GET /api/livreurs - List all livreurs (ADMIN)
// POST /api/livreurs - Create livreur (ADMIN)
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/bm/lib/auth'
import bcrypt from 'bcrypt'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole(request, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    const livreurs = await db.user.findMany({
      where: { role: 'LIVREUR' },
      select: {
        id: true,
        name: true,
        phone: true,
        isAvailable: true,
        createdAt: true,
        ordersAssigned: {
          select: { id: true, status: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    const result = livreurs.map((livreur) => {
      const totalOrders = livreur.ordersAssigned.length
      const activeOrders = livreur.ordersAssigned.filter(
        (o) => !['DELIVERED', 'CANCELLED'].includes(o.status)
      ).length
      const deliveredOrders = livreur.ordersAssigned.filter(
        (o) => o.status === 'DELIVERED'
      ).length

      return {
        id: livreur.id,
        name: livreur.name,
        phone: livreur.phone,
        isAvailable: livreur.isAvailable,
        orderCounts: { total: totalOrders, active: activeOrders, delivered: deliveredOrders },
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Livreurs] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole(request, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    const body = await request.json()
    const { name, phone, password, isAvailable } = body

    if (!name || !phone || !password) {
      return NextResponse.json(
        { error: 'Name, phone, and password are required' },
        { status: 400 }
      )
    }

    // Check if phone already exists (race-condition safe via try/catch on unique constraint)
    const existing = await db.user.findUnique({ where: { phone } })
    if (existing) {
      return NextResponse.json(
        { error: 'Phone number already registered' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    try {
      const livreur = await db.user.create({
        data: {
          name,
          phone,
          password: hashedPassword,
          role: 'LIVREUR',
          isAvailable: isAvailable !== undefined ? isAvailable : true,
        },
        select: {
          id: true,
          name: true,
          phone: true,
          isAvailable: true,
          role: true,
          createdAt: true,
        },
      })

      return NextResponse.json(livreur, { status: 201 })
    } catch (createError: any) {
      // Handle Prisma unique constraint violation (P2002) for race conditions
      if (createError?.code === 'P2002' && createError?.meta?.target?.includes('phone')) {
        return NextResponse.json(
          { error: 'Phone number already registered' },
          { status: 400 }
        )
      }
      throw createError
    }
  } catch (error) {
    console.error('[Livreurs/POST] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
