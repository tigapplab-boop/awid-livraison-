// ========================================
// AWID / BURGER MINUTE - Order [id] API Route
// GET /api/orders/[id] - Get order by ID
// PATCH /api/orders/[id] - Update order status
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest, type JwtPayload } from '@/bm/lib/auth'
import { rateLimit } from '@/bm/lib/rate-limit'

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown'
    const rateResult = rateLimit(clientIp, { maxRequests: 60, windowMs: 60_000, key: 'orders-id-get' })
    if (!rateResult.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(Math.ceil((rateResult.resetAt - Date.now()) / 1000)) } })
    }

    const { id } = await params
    const clientToken = request.nextUrl.searchParams.get('clientToken')

    const order = await db.order.findUnique({
      where: { id },
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

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Vérifier auth admin/livreur
    const authResult = await authenticateRequest(request)

    if (authResult instanceof NextResponse) {
      // Pas authentifié → vérifier clientToken
      if (!clientToken || order.clientToken !== clientToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Si clientToken uniquement, masquer les données sensibles
    if (authResult instanceof NextResponse && clientToken) {
      const sanitized = {
        ...order,
        clientPhone: undefined,
        assignedLivreur: order.assignedLivreur ? { name: order.assignedLivreur.name } : null,
      }
      return NextResponse.json(sanitized)
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('[Orders/Id] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Auth required
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) return authResult

    const user = authResult as JwtPayload

    const order = await db.order.findUnique({
      where: { id },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { status, amountPaid, changeDue, paymentIssue, paymentIssueNote } = body

    // Status transition
    if (status) {
      const allowedTransitions = VALID_TRANSITIONS[order.status] || []
      if (!allowedTransitions.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status transition: ${order.status} -> ${status}` },
          { status: 400 }
        )
      }

      // Build update data
      const updateData: Record<string, unknown> = { status }

      // Set timestamps for status changes
      if (status === 'CONFIRMED') {
        updateData.confirmedAt = new Date()
      } else if (status === 'PREPARING') {
        // Note: preparedAt records when preparation starts (Prisma field naming)
        updateData.preparedAt = new Date()
      } else if (status === 'READY') {
        updateData.readyAt = new Date()
      } else if (status === 'DELIVERED') {
        updateData.deliveredAt = new Date()
        updateData.pickedUpAt = order.pickedUpAt || new Date()
        // If no payment issue, mark as PAID
        if (!paymentIssue || paymentIssue === 'NONE') {
          updateData.paymentStatus = 'PAID'
        }
      } else if (status === 'CANCELLED') {
        updateData.cancelledAt = new Date()
        updateData.cancelReason = body.cancelReason || null
      }

      // Cash processing
      if (typeof amountPaid === 'number') {
        updateData.amountPaid = amountPaid
        updateData.changeDue = (changeDue !== undefined) ? changeDue : Math.max(0, amountPaid - order.total)
        if (!paymentIssue || paymentIssue === 'NONE') {
          updateData.paymentStatus = 'PAID'
        }
      }

      // Payment issue
      if (paymentIssue && paymentIssue !== 'NONE') {
        updateData.paymentIssue = paymentIssue
        updateData.paymentIssueNote = paymentIssueNote || null
        updateData.paymentStatus = 'PARTIAL'
      }

      const updatedOrder = await db.order.update({
        where: { id },
        data: updateData,
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

      // Emit real-time socket event for status change
      try {
        const { emitToRoom } = await import('@/bm/lib/socket')
        await emitToRoom('order:status', `order:${id}`, {
          orderId: id,
          status,
          order: updatedOrder,
        })
        // Also notify admin/cuisine rooms for dashboard updates
        await emitToRoom('order:status', 'admin', {
          orderId: id,
          status,
          order: updatedOrder,
        })
        await emitToRoom('order:status', 'cuisine', {
          orderId: id,
          status,
          order: updatedOrder,
        })
        if (updatedOrder.assignedLivreurId) {
          await emitToRoom('order:status', `livreur:${updatedOrder.assignedLivreurId}`, {
            orderId: id,
            status,
            order: updatedOrder,
          })
        }
      } catch (emitErr) {
        console.warn('[Orders/Id] Socket emit failed (non-critical):', emitErr)
      }

      // Send push notifications for important status changes
      try {
        const { sendPushToUser } = await import('@/bm/lib/push-send')
        // Notify the assigned livreur about status changes
        if (updatedOrder.assignedLivreurId) {
          const statusMessages: Record<string, { title: string; body: string }> = {
            PREPARING: { title: 'Commande en préparation', body: `Commande #${updatedOrder.orderNumber} en cours de préparation` },
            READY: { title: 'Commande prête !', body: `Commande #${updatedOrder.orderNumber} est prête pour livraison` },
            CANCELLED: { title: 'Commande annulée', body: `Commande #${updatedOrder.orderNumber} a été annulée` },
          }
          const msg = statusMessages[status]
          if (msg) {
            await sendPushToUser(updatedOrder.assignedLivreurId, {
              title: msg.title,
              body: msg.body,
              icon: '/icon-192.png',
              tag: `order-${id}`,
              data: { type: 'livreur', url: '/livreur/dashboard' },
            })
          }
        }
        // Notify all admins about status changes
        const { sendPushToAll } = await import('@/bm/lib/push-send')
        if (status === 'READY' || status === 'DELIVERED' || status === 'CANCELLED') {
          const adminMessages: Record<string, { title: string; body: string }> = {
            READY: { title: 'Commande prête', body: `Commande #${updatedOrder.orderNumber} prête pour livraison` },
            DELIVERED: { title: 'Commande livrée', body: `Commande #${updatedOrder.orderNumber} livrée avec succès` },
            CANCELLED: { title: 'Commande annulée', body: `Commande #${updatedOrder.orderNumber} a été annulée` },
          }
          const msg = adminMessages[status]
          if (msg) {
            await sendPushToAll({
              title: msg.title,
              body: msg.body,
              icon: '/icon-192.png',
              tag: `order-${id}`,
              data: { type: 'admin', url: '/admin/dashboard' },
            })
          }
        }
      } catch (pushErr) {
        console.warn('[Orders/Id] Push notification failed (non-critical):', pushErr)
      }

      return NextResponse.json(updatedOrder)
    }

    // If only payment updates (no status change)
    const updateData: Record<string, unknown> = {}

    if (typeof amountPaid === 'number') {
      updateData.amountPaid = amountPaid
      updateData.changeDue = (changeDue !== undefined) ? changeDue : Math.max(0, amountPaid - order.total)
      updateData.paymentStatus = 'PAID'
    }

    if (paymentIssue && paymentIssue !== 'NONE') {
      updateData.paymentIssue = paymentIssue
      updateData.paymentIssueNote = paymentIssueNote || null
      updateData.paymentStatus = 'PARTIAL'
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const updatedOrder = await db.order.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('[Orders/Id] PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
