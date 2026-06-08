// ========================================
// AWID / BURGER MINUTE - Orders Temp Cancel-Create API Route
// POST /api/orders-temp/[token]/cancel-create - Cancel old, create new
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cancelAndCreate } from '@/bm/lib/order-temp-store'

const PHONE_REGEX = /^0[5-7][0-9]{8}$/

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
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
        { error: 'Invalid phone number' },
        { status: 400 }
      )
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item is required' },
        { status: 400 }
      )
    }

    // Get zone (accept both UUID and name)
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

    // Enrich items
    const productIds = items.map((item: { productId: string }) => item.productId)
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, price: true },
    })

    const productMap = new Map<string, { id: string; name: string; price: number }>(
      products.map(p => [p.id, p])
    )

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

    // Find livreur
    const livreur = await db.user.findFirst({
      where: { role: 'LIVREUR', isAvailable: true },
      orderBy: { createdAt: 'asc' },
    })

    const calculatedSubtotal = subtotal || enrichedItems.reduce((sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity, 0)

    const newOrder = await cancelAndCreate(token, {
      clientPhone,
      clientName,
      clientAddress,
      deliveryZone: zone.name, // Store readable name
      deliveryZoneId: zone.id,
      items: enrichedItems,
      subtotal: calculatedSubtotal,
      deliveryFee: deliveryFee || 0,
      isNightDelivery: isNightDelivery || false,
      livreurId: livreur?.id || null,
      notes,
    })

    if (!newOrder) {
      return NextResponse.json(
        { error: 'Temp order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      action: 'CREATED',
      tempToken: newOrder.tempToken,
      orderTemp: newOrder,
    })
  } catch (error) {
    console.error('[OrdersTemp/CancelCreate] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
