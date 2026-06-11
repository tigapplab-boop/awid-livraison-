// ========================================
// API PRODUITS - Ajuster Stock Manuellement
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/products/[id]/stock - Ajuster stock manuellement
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await req.json()
    const { stockQuantity, reason } = body

    if (stockQuantity === undefined) {
      return NextResponse.json(
        { error: 'stockQuantity is required' },
        { status: 400 }
      )
    }

    const product = await db.product.update({
      where: { id },
      data: {
        stockQuantity: Math.max(0, stockQuantity),
      },
    })

    console.log(
      `[PATCH /api/products/:id/stock] Adjusted ${product.name} stock to ${stockQuantity}.`,
      reason ? `Reason: ${reason}` : ''
    )

    return NextResponse.json(product)
  } catch (error) {
    console.error('[PATCH /api/products/:id/stock] Error:', error)
    return NextResponse.json(
      { error: 'Failed to adjust stock' },
      { status: 500 }
    )
  }
}
