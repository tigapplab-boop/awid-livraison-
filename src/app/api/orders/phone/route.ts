// ========================================
// AWID / BURGER MINUTE - Phone Order API Route
// POST /api/orders/phone - Create order from phone call (ADMIN only)
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, type JwtPayload } from '@/bm/lib/auth'
import { generateOrderNumber } from '@/bm/lib/order-number'
import { v4 as uuidv4 } from 'uuid'
import { isNightTime } from '@/bm/lib/format'

const PHONE_REGEX = /^0[5-7][0-9]{8}$/

export async function POST(request: NextRequest) {
  try {
    // Require ADMIN role
    const authResult = await requireRole(request, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    const user = authResult as JwtPayload

    const body = await request.json()
    const {
      clientName,
      clientPhone,
      clientAddress,
      deliveryZone,
      items,
      livreurId,
      notes,
    } = body

    // Validation
    if (!clientPhone || !PHONE_REGEX.test(clientPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number. Must match Algerian format: 0[5-7]XXXXXXXX' },
        { status: 400 }
      )
    }

    if (!clientName || typeof clientName !== 'string' || clientName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Client name is required' },
        { status: 400 }
      )
    }

    if (!clientAddress || typeof clientAddress !== 'string' || clientAddress.trim().length === 0) {
      return NextResponse.json(
        { error: 'Client address is required' },
        { status: 400 }
      )
    }

    if (!deliveryZone || typeof deliveryZone !== 'string') {
      return NextResponse.json(
        { error: 'Delivery zone is required' },
        { status: 400 }
      )
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item is required' },
        { status: 400 }
      )
    }

    if (!livreurId) {
      return NextResponse.json(
        { error: 'Livreur assignment is required for phone orders' },
        { status: 400 }
      )
    }

    // Verify livreur exists
    const livreur = await db.user.findUnique({
      where: { id: livreurId },
    })

    if (!livreur || livreur.role !== 'LIVREUR') {
      return NextResponse.json(
        { error: 'Invalid livreur' },
        { status: 400 }
      )
    }

    // Verify zone (accept both UUID and name)
    const zone = await db.deliveryZone.findFirst({
      where: {
        isActive: true,
        OR: [{ id: deliveryZone }, { name: deliveryZone }],
      },
    })

    if (!zone) {
      return NextResponse.json(
        { error: 'Invalid delivery zone' },
        { status: 400 }
      )
    }

    // Resolve zone name for consistent storage
    const resolvedDeliveryZone = zone.name

    // Calculate delivery fee based on current time
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`
    const isNight = isNightTime(currentTimeStr, zone.startNight, zone.endNight)
    const deliveryFee = isNight ? zone.nightFee : zone.dayFee

    // Get product details for items
    const productIds = items.map((item: { productId: string }) => item.productId)
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, price: true },
    })

    const productMap = new Map<string, { id: string; name: string; price: number }>(
      products.map(p => [p.id, p])
    )

    // Calculate subtotal from products
    const orderItems = items.map((item: { productId: string; quantity: number; attachedToProductId?: string }) => {
      const product = productMap.get(item.productId)
      if (!product) {
        throw new Error(`Product ${item.productId} not found`)
      }
      return {
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
        attachedToProductId: item.attachedToProductId || null,
      }
    })

    const subtotal = orderItems.reduce((sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity, 0)
    const total = subtotal + deliveryFee

    // Create everything in a transaction
    const result = await db.$transaction(async (tx) => {
      // 1. Create or find Client
      let client = await tx.client.findUnique({
        where: { phone: clientPhone },
      })

      if (!client) {
        client = await tx.client.create({
          data: {
            id: uuidv4(),
            phone: clientPhone,
            name: clientName.trim(),
            firstOrderAt: new Date(),
          },
        })
      } else if (!client.name) {
        client = await tx.client.update({
          where: { id: client.id },
          data: { name: clientName.trim() },
        })
      }

      // 2. Create ClientAddress
      await tx.clientAddress.create({
        data: {
          id: uuidv4(),
          clientId: client.id,
          address: clientAddress.trim(),
          zone: resolvedDeliveryZone,
          isDefault: true,
        },
      })

      // 3. Generate order number
      const orderNumber = await generateOrderNumber()

      // 4. Create Order
      const order = await tx.order.create({
        data: {
          id: uuidv4(),
          orderNumber,
          type: body.type || 'ONLINE',
          source: body.source || 'PHONE_CALL',
          status: 'CONFIRMED',
          clientId: client.id,
          clientPhone,
          assignedLivreurId: livreurId,
          createdByAdminId: user.userId,
          clientAddress: clientAddress.trim(),
          deliveryZone: resolvedDeliveryZone,
          deliveryFee,
          isNightDelivery: isNight,
          subtotal,
          total,
          confirmedAt: new Date(),
          assignedAt: new Date(),
          notes: notes || null,
          paymentMethod: 'CASH',
          paymentStatus: 'PENDING',
        },
      })

      // 5. Create OrderItems
      for (const item of orderItems) {
        await tx.orderItem.create({
          data: {
            id: uuidv4(),
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            attachedToProductId: item.attachedToProductId,
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

    // Emit real-time socket events for phone orders
    try {
      const { emitToRoom } = await import('@/bm/lib/socket')
      await emitToRoom('order:new', 'admin', { order: fullOrder })
      await emitToRoom('order:new', 'cuisine', { order: fullOrder })
      if (fullOrder?.assignedLivreurId) {
        await emitToRoom('order:assigned', `livreur:${fullOrder.assignedLivreurId}`, { order: fullOrder })
      }
    } catch (emitErr) {
      console.warn('[Orders/Phone] Socket emit failed (non-critical):', emitErr)
    }

    return NextResponse.json(fullOrder, { status: 201 })
  } catch (error) {
    console.error('[Orders/Phone] POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

