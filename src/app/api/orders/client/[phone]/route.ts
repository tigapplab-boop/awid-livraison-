// ========================================
// AWID / BURGER MINUTE - Orders by Client Phone API Route
// GET /api/orders/client/[phone] - Get orders by client phone
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params

    const orders = await db.order.findMany({
      where: { clientPhone: phone },
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
    console.error('[Orders/Client/Phone] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
