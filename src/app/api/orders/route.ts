// ========================================
// AWID / BURGER MINUTE - Orders API Route
// GET /api/orders - List orders with filters
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest, type JwtPayload } from '@/bm/lib/auth'
import { rateLimit } from '@/bm/lib/rate-limit'

export async function GET(request: NextRequest) {
  try {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown'
    const rateResult = rateLimit(clientIp, { maxRequests: 30, windowMs: 60_000, key: 'orders-get' })
    if (!rateResult.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(Math.ceil((rateResult.resetAt - Date.now()) / 1000)) } })
    }
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
      select: {
        id: true,
        orderNumber: true,
        type: true,
        source: true,
        status: true,
        clientId: true,
        clientPhone: true,
        clientToken: true,
        assignedLivreurId: true,
        createdByAdminId: true,
        assignedAt: true,
        clientAddress: true,
        deliveryZone: true,
        deliveryFee: true,
        isNightDelivery: true,
        subtotal: true,
        total: true,
        amountPaid: true,
        changeDue: true,
        paymentIssue: true,
        paymentIssueNote: true,
        createdAt: true,
        confirmedAt: true,
        preparedAt: true,
        readyAt: true,
        pickedUpAt: true,
        deliveredAt: true,
        cancelledAt: true,
        cancelReason: true,
        notes: true,
        paymentMethod: true,
        paymentStatus: true,
        items: {
          select: {
            id: true,
            quantity: true,
            price: true,
            notes: true,
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
          select: { 
            id: true, 
            name: true, 
            phone: true, 
            isAvailable: true 
          },
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
