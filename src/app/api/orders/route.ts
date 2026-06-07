// ========================================
// AWID / BURGER MINUTE - Orders API Route
// GET /api/orders - List orders with filters
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest, type JwtPayload } from '@/bm/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Auth required
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) return authResult

    const user = authResult as JwtPayload

    const status = request.nextUrl.searchParams.get('status')
    const livreurId = request.nextUrl.searchParams.get('livreurId')
    const source = request.nextUrl.searchParams.get('source')

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    if (livreurId) {
      where.assignedLivreurId = livreurId
    } else if (user.role === 'LIVREUR') {
      // Livreurs can only see their own orders
      where.assignedLivreurId = user.userId
    }

    if (source) {
      where.source = source
    }

    const orders = await db.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                nameAr: true,
                price: true,
                image: true,
              },
            },
          },
        },
        assignedLivreur: {
          select: { id: true, name: true, phone: true, isAvailable: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('[Orders] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
