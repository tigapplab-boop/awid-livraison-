// ========================================
// AWID / BURGER MINUTE - Orders Temp Validate API Route
// PATCH /api/orders-temp/[token]/validate - Validate temp order (livreur)
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTempOrderByToken, updateTempOrderStatus } from '@/bm/lib/order-temp-store'
import { authenticateRequest, type JwtPayload } from '@/bm/lib/auth'
import { generateOrderNumber } from '@/bm/lib/order-number'
import { v4 as uuidv4 } from 'uuid'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Auth required - LIVREUR or ADMIN
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) return authResult

    const user = authResult as JwtPayload

    if (user.role !== 'LIVREUR' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only livreurs can validate orders' },
        { status: 403 }
      )
    }

    const tempOrder = await getTempOrderByToken(token)
    if (!tempOrder) {
      return NextResponse.json(
        { error: 'Temp order not found or expired' },
        { status: 404 }
      )
    }

    if (tempOrder.status !== 'PENDING' && tempOrder.status !== 'ACCEPTED') {
      return NextResponse.json(
        { error: 'Order must be in PENDING or ACCEPTED status to validate' },
        { status: 400 }
      )
    }

    // Check expiry
    if (new Date(tempOrder.expiresAt) <= new Date()) {
      await updateTempOrderStatus(token, 'EXPIRED')
      return NextResponse.json(
        { error: 'Order has expired' },
        { status: 400 }
      )
    }

    try {
      // Use Prisma transaction to create everything atomically
      const result = await db.$transaction(async (tx) => {
        // 1. Create or find Client
        let client = await tx.client.findUnique({
          where: { phone: tempOrder.clientPhone },
        })

        if (!client) {
          client = await tx.client.create({
            data: {
              id: uuidv4(),
              phone: tempOrder.clientPhone,
              name: tempOrder.clientName,
              firstOrderAt: new Date(),
            },
          })
        } else if (tempOrder.clientName && !client.name) {
          client = await tx.client.update({
            where: { id: client.id },
            data: { name: tempOrder.clientName },
          })
        }

        // 2. Create ClientAddress
        await tx.clientAddress.create({
          data: {
            id: uuidv4(),
            clientId: client.id,
            address: tempOrder.clientAddress,
            zone: tempOrder.deliveryZone,
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
            type: 'ONLINE',
            source: 'ONLINE',
            status: 'CONFIRMED',
            clientId: client.id,
            clientPhone: tempOrder.clientPhone,
            assignedLivreurId: tempOrder.livreurId,
            clientAddress: tempOrder.clientAddress,
            deliveryZone: tempOrder.deliveryZone,
            deliveryFee: tempOrder.deliveryFee,
            isNightDelivery: tempOrder.isNightDelivery,
            subtotal: tempOrder.subtotal,
            total: tempOrder.total,
            confirmedAt: new Date(),
            notes: tempOrder.notes || null,
            paymentMethod: 'CASH',
            paymentStatus: 'PENDING',
            sourceTempId: tempOrder.id,
            sourceVersion: tempOrder.version,
          },
        })

        // 5. Create OrderItems
        for (const item of tempOrder.items) {
          await tx.orderItem.create({
            data: {
              id: uuidv4(),
              orderId: order.id,
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              notes: item.notes || null,
            },
          })
        }

        // 6. Generate ClientToken
        const clientTokenStr = uuidv4()
        await tx.clientToken.create({
          data: {
            id: uuidv4(),
            token: clientTokenStr,
            clientId: client.id,
          },
        })

        return { orderId: order.id, orderNumber, clientToken: clientTokenStr }
      })

      // Mark temp order as validated
      await updateTempOrderStatus(token, 'VALIDATED')

      // Emit real-time socket events
      try {
        const { emitToRoom } = await import('@/bm/lib/socket')
        // Notify client their order was validated
        await emitToRoom('order:validated', `client:${token}`, {
          orderId: result.orderId,
          orderNumber: result.orderNumber,
          clientToken: result.clientToken,
        })
        // Notify livreurs/admins that a new confirmed order is available
        await emitToRoom('order:confirmed', 'admin', {
          orderId: result.orderId,
          orderNumber: result.orderNumber,
          status: 'CONFIRMED',
        })
        await emitToRoom('order:confirmed', 'cuisine', {
          orderId: result.orderId,
          orderNumber: result.orderNumber,
          status: 'CONFIRMED',
        })
      } catch (emitErr) {
        console.warn('[OrdersTemp/Validate] Socket emit failed (non-critical):', emitErr)
      }

      // Fetch the full order with relations (needed for push notification)
      const fullOrder = await db.order.findUnique({
        where: { id: result.orderId },
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

      // Push notify assigned livreur
      if (fullOrder?.assignedLivreurId) {
        try {
          const { sendPushToUser } = await import('@/bm/lib/push-send')
          await sendPushToUser(fullOrder.assignedLivreurId, {
            title: 'Commande confirmée',
            body: `Commande #${result.orderNumber} validée et confirmée`,
            icon: '/icon-192.png',
            tag: `order-${result.orderId}`,
            data: { type: 'livreur', url: '/livreur/dashboard' },
          })
        } catch (pushErr) {
          console.warn('[OrdersTemp/Validate] Push notification failed (non-critical):', pushErr)
        }
      }

      return NextResponse.json({
        order: fullOrder,
        clientToken: result.clientToken,
      })
    } catch (error) {
      console.error('[OrdersTemp/Validate] Transaction error:', error)
      return NextResponse.json(
        { error: 'Failed to validate order' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[OrdersTemp/Validate] PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
