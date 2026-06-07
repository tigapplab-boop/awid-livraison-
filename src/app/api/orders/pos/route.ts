// ========================================
// AWID / BURGER MINUTE - POS Order API Route
// POST /api/orders/pos - Create POS (sur place) order (ADMIN only)
// Bypasses phone validation for on-premise orders
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, type JwtPayload } from '@/bm/lib/auth'
import { generateOrderNumber } from '@/bm/lib/order-number'
import { v4 as uuidv4 } from 'uuid'

// Default POS client phone (valid Algerian format)
const POS_CLIENT_PHONE = '0500000000'

export async function POST(request: NextRequest) {
  try {
    // Require ADMIN role
    const authResult = await requireRole(request, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    const user = authResult as JwtPayload

    const body = await request.json()
    const { items, notes } = body

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item is required' },
        { status: 400 }
      )
    }

    // Get product details for items
    const productIds = items.map((item: { productId: string }) => item.productId)
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, price: true },
    })

    const productMap = new Map(products.map(p => [p.id, p]))

    // Calculate subtotal from products
    const orderItems = items.map((item: { productId: string; quantity: number }) => {
      const product = productMap.get(item.productId)
      if (!product) {
        throw new Error(`Product ${item.productId} not found`)
      }
      return {
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
      }
    })

    const subtotal = orderItems.reduce((sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity, 0)
    // POS orders have no delivery fee
    const deliveryFee = 0
    const total = subtotal

    // Create everything in a transaction
    const result = await db.$transaction(async (tx) => {
      // 1. Find or create POS client
      let client = await tx.client.findUnique({
        where: { phone: POS_CLIENT_PHONE },
      })

      if (!client) {
        client = await tx.client.create({
          data: {
            id: uuidv4(),
            phone: POS_CLIENT_PHONE,
            name: 'Client Sur Place',
            firstOrderAt: new Date(),
          },
        })
      }

      // 2. Generate order number
      const orderNumber = await generateOrderNumber()

      // 3. Create Order (POS type, no delivery, no livreur)
      const order = await tx.order.create({
        data: {
          id: uuidv4(),
          orderNumber,
          type: 'POS',
          source: 'POS',
          status: 'CONFIRMED',
          clientId: client.id,
          clientPhone: POS_CLIENT_PHONE,
          createdByAdminId: user.userId,
          clientAddress: 'Sur place',
          deliveryZone: 'Ville',
          deliveryFee,
          isNightDelivery: false,
          subtotal,
          total,
          confirmedAt: new Date(),
          notes: notes || null,
          paymentMethod: 'CASH',
          paymentStatus: 'PENDING',
        },
      })

      // 4. Create OrderItems
      for (const item of orderItems) {
        await tx.orderItem.create({
          data: {
            id: uuidv4(),
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          },
        })
      }

      return order
    })

    // Fetch the full order with relations
    const fullOrder = await db.order.findUnique({
      where: { id: result.id },
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
    })

    // Emit real-time event for admin/cuisine
    try {
      const { emitToRoom } = await import('@/bm/lib/socket')
      await emitToRoom('order:new', 'admin', { order: fullOrder })
      await emitToRoom('order:new', 'cuisine', { order: fullOrder })
    } catch (emitErr) {
      console.warn('[Orders/POS] Socket emit failed (non-critical):', emitErr)
    }

    return NextResponse.json(fullOrder, { status: 201 })
  } catch (error) {
    console.error('[Orders/POS] POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
