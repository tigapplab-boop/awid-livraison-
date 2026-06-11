// ========================================
// API PRODUITS - Liste Produits en Alerte Stock
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/products/low-stock - Produits en alerte stock
export async function GET(req: NextRequest) {
  try {
    const products = await db.product.findMany({
      where: {
        trackStock: true,
        isAvailable: true,
      },
      include: {
        category: true,
      },
    })

    // Filtrer ceux avec stock <= minAlert
    const lowStockProducts = products.filter((p) => {
      const stock = p.stockQuantity || 0
      const minAlert = p.minStockAlert || 10
      return stock <= minAlert
    })

    // Trier par urgence (stock le plus bas en premier)
    lowStockProducts.sort((a, b) => {
      const stockA = a.stockQuantity || 0
      const stockB = b.stockQuantity || 0
      return stockA - stockB
    })

    return NextResponse.json(lowStockProducts)
  } catch (error) {
    console.error('[GET /api/products/low-stock] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch low stock products' },
      { status: 500 }
    )
  }
}
