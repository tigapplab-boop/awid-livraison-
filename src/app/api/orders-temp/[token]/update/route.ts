// ========================================
// AWID / BURGER MINUTE - Orders Temp Update API Route
// POST /api/orders-temp/[token]/update - Update temp order (creates new version)
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { replaceTempOrder } from '@/bm/lib/order-temp-store'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { items, clientName, clientAddress, deliveryZone, notes } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item is required' },
        { status: 400 }
      )
    }

    // Enrich items with product names if needed
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

    // Get zone ID if delivery zone changed (accept both UUID and name)
    let deliveryZoneId: string | undefined
    let resolvedZoneName: string | undefined
    if (deliveryZone) {
      const zone = await db.deliveryZone.findFirst({
        where: {
          isActive: true,
          OR: [{ id: deliveryZone }, { name: deliveryZone }],
        },
      })
      if (zone) {
        deliveryZoneId = zone.id
        resolvedZoneName = zone.name
      }
    }

    const newOrder = replaceTempOrder(token, {
      items: enrichedItems,
      clientName,
      clientAddress,
      deliveryZone: resolvedZoneName ?? deliveryZone,
      deliveryZoneId,
      notes,
    })

    if (!newOrder) {
      return NextResponse.json(
        { error: 'Temp order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(newOrder)
  } catch (error) {
    console.error('[OrdersTemp/Update] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
