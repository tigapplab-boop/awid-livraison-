// ========================================
// AWID / BURGER MINUTE - Orders Temp API Route
// POST /api/orders-temp - Create temporary order
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createTempOrder, getAvailableTempOrders, getAllPendingTempOrders } from '@/bm/lib/order-temp-store'
import { authenticateRequest, type JwtPayload } from '@/bm/lib/auth'
import { rateLimit } from '@/bm/lib/rate-limit'

const PHONE_REGEX = /^0[5-7][0-9]{8}$/

export async function GET(request: NextRequest) {
  try {
    // Auth required - LIVREUR or ADMIN
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) return authResult

    const user = authResult as JwtPayload

    if (user.role !== 'LIVREUR' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // If livreur, only return PENDING orders (available to all) + ACCEPTED by this livreur
    // If admin, return all pending and accepted orders
    const orders = user.role === 'LIVREUR'
      ? getAvailableTempOrders(user.userId)
      : getAllPendingTempOrders()

    return NextResponse.json(orders)
  } catch (error) {
    console.error('[OrdersTemp] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Rate limit: 5 order creations per minute per IP
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'
  const rateResult = rateLimit(clientIp, {
    maxRequests: 5,
    windowMs: 60_000,
    key: 'orders-temp',
  })
  if (!rateResult.allowed) {
    return NextResponse.json(
      { error: 'Too many order requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateResult.resetAt - Date.now()) / 1000)),
        },
      }
    )
  }

  try {
    const body = await request.json()
    const {
      clientPhone,
      clientName,
      clientAddress,
      deliveryZone,
      items,
      subtotal,
      deliveryFee,
      isNightDelivery,
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

    // Validate items
    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity < 1) {
        return NextResponse.json(
          { error: 'Each item must have productId and quantity >= 1' },
          { status: 400 }
        )
      }
      if (item.price !== undefined && typeof item.price !== 'number') {
        return NextResponse.json(
          { error: 'Each item price must be a number if provided' },
          { status: 400 }
        )
      }
    }

    // Validate zone exists - accept both zone ID (UUID) and zone name
    const zone = await db.deliveryZone.findFirst({
      where: {
        isActive: true,
        OR: [
          { id: deliveryZone },
          { name: deliveryZone },
        ],
      },
    })

    if (!zone) {
      return NextResponse.json(
        { error: 'Invalid delivery zone' },
        { status: 400 }
      )
    }

    // Get product names for items that don't have them
    const productIds = items.map((item: { productId: string }) => item.productId)
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, price: true },
    })

    const productMap = new Map(products.map(p => [p.id, p]))

    const enrichedItems = items.map((item: { productId: string; quantity: number; price?: number; name?: string; notes?: string }) => {
      const product = productMap.get(item.productId)
      return {
        productId: item.productId,
        name: item.name || product?.name || 'Unknown Product',
        quantity: item.quantity,
        price: item.price || product?.price || 0,
        notes: item.notes,
      }
    })

    const calculatedSubtotal = subtotal || enrichedItems.reduce((sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity, 0)

    // Create temp order - no auto-assignment, first livreur to accept claims it
    const result = createTempOrder({
      clientPhone,
      clientName: clientName.trim(),
      clientAddress: clientAddress.trim(),
      deliveryZone: zone.name, // Store readable name (VILLE, Hors Ville, etc.)
      deliveryZoneId: zone.id,
      items: enrichedItems,
      subtotal: calculatedSubtotal,
      deliveryFee: deliveryFee || 0,
      isNightDelivery: isNightDelivery || false,
      livreurId: null, // No auto-assignment
      notes,
    })

    if (result.action === 'EXISTING_PENDING') {
      return NextResponse.json({
        action: 'EXISTING_PENDING',
        existingOrder: result.existingOrder,
      })
    }

    // Emit real-time socket event for new temp order
    try {
      const { emitToRoom } = await import('@/bm/lib/socket')
      await emitToRoom('order:new', 'livreur', { order: result.orderTemp })
      await emitToRoom('order:new', 'admin', { order: result.orderTemp })
    } catch (emitErr) {
      console.warn('[OrdersTemp] Socket emit failed (non-critical):', emitErr)
    }

    // Send push notifications to all available livreurs
    try {
      const { sendPushToAll } = await import('@/bm/lib/push-send')
      await sendPushToAll({
        title: 'Nouvelle commande !',
        body: `Commande de ${result.orderTemp.clientName} - ${result.orderTemp.subtotal} DA`,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        tag: 'new-order',
        requireInteraction: true,
        data: { type: 'livreur', url: '/livreur/dashboard' },
      })
    } catch (pushErr) {
      console.warn('[OrdersTemp] Push notification failed (non-critical):', pushErr)
    }

    return NextResponse.json({
      action: 'CREATED',
      tempToken: result.tempToken,
      orderTemp: result.orderTemp,
    }, { status: 201 })
  } catch (error) {
    console.error('[OrdersTemp] Create error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
