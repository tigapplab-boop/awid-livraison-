// ========================================
// API INVENTAIRE - Rapport Bénéfices par Produit
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/bm/lib/auth'
import { db } from '@/lib/db'
import { calculateProfit } from '@/lib/inventory/calculations'

interface ProfitReport {
  productId: string
  productName: string
  productNameAr: string | null
  category: string
  supplier: string
  purchasePrice: number
  sellingPrice: number
  currentStock: number
  profit: number
  profitMargin: number
  totalProfit: number
}

// GET /api/inventory/reports/profits - Bénéfices par produit
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireRole(req, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    const products = await db.inventoryProduct.findMany({
      orderBy: { name: 'asc' },
    })

    const reports: ProfitReport[] = products.map((product) => {
      const profitData = calculateProfit(
        product.purchasePrice,
        product.sellingPrice,
        product.currentStock
      )

      return {
        productId: product.id,
        productName: product.name,
        productNameAr: product.nameAr,
        category: product.category,
        supplier: product.supplier,
        purchasePrice: product.purchasePrice,
        sellingPrice: product.sellingPrice,
        currentStock: product.currentStock,
        ...profitData,
      }
    })

    // Trier par bénéfice total décroissant
    reports.sort((a, b) => b.totalProfit - a.totalProfit)

    return NextResponse.json(reports)
  } catch (error) {
    console.error('[GET /api/inventory/reports/profits] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate profits report' },
      { status: 500 }
    )
  }
}
