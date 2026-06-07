// ========================================
// AWID / BURGER MINUTE - Finance API Route
// GET /api/finance - Finance view with payment details (ADMIN only)
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/bm/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Require ADMIN role
    const authResult = await requireRole(request, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    const paymentStatus = request.nextUrl.searchParams.get('paymentStatus')
    const dateFrom = request.nextUrl.searchParams.get('dateFrom')
    const dateTo = request.nextUrl.searchParams.get('dateTo')

    const where: Record<string, unknown> = {}

    if (paymentStatus) {
      where.paymentStatus = paymentStatus
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom)
      }
      if (dateTo) {
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        ;(where.createdAt as Record<string, unknown>).lte = to
      }
    }

    const orders = await db.order.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
        source: true,
        status: true,
        clientPhone: true,
        clientAddress: true,
        subtotal: true,
        total: true,
        deliveryFee: true,
        amountPaid: true,
        changeDue: true,
        paymentMethod: true,
        paymentStatus: true,
        paymentIssue: true,
        paymentIssueNote: true,
        createdAt: true,
        deliveredAt: true,
        assignedLivreur: {
          select: { id: true, name: true },
        },
        items: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            price: true,
            product: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate summary
    const summary = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
      totalPaid: orders.filter((o) => o.paymentStatus === 'PAID').reduce((sum, o) => sum + (o.amountPaid || 0), 0),
      totalPending: orders.filter((o) => o.paymentStatus === 'PENDING').reduce((sum, o) => sum + o.total, 0),
      totalPartial: orders.filter((o) => o.paymentStatus === 'PARTIAL').reduce((sum, o) => sum + o.total, 0),
      totalOffered: orders.filter((o) => o.paymentStatus === 'OFFERED').reduce((sum, o) => sum + o.total, 0),
      totalDeliveryFees: orders.reduce((sum, o) => sum + o.deliveryFee, 0),
    }

    return NextResponse.json({
      summary,
      orders,
    })
  } catch (error) {
    console.error('[Finance] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
