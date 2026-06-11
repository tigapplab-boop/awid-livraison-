// ========================================
// API INVENTAIRE - Calcul Bénéfice Produit
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { calculateProfit } from '@/lib/inventory/calculations'

// GET /api/inventory/products/[id]/profit - Calcul bénéfice
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const product = await db.inventoryProduct.findUnique({
      where: { id },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const profitData = calculateProfit(
      product.purchasePrice,
      product.sellingPrice,
      product.currentStock
    )

    return NextResponse.json({
      productId: product.id,
      productName: product.name,
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      currentStock: product.currentStock,
      ...profitData,
    })
  } catch (error) {
    console.error('[GET /api/inventory/products/:id/profit] Error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate profit' },
      { status: 500 }
    )
  }
}
