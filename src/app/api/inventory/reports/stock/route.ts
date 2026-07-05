// ========================================
// API INVENTAIRE - Rapport État du Stock
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/bm/lib/auth'
import { db } from '@/lib/db'
import { getStockStatus } from '@/lib/inventory/calculations'

interface StockReport {
  productId: string
  productName: string
  productNameAr: string | null
  category: string
  supplier: string
  currentStock: number
  minStock: number
  unit: string
  status: 'OK' | 'LOW' | 'OUT'
}

// GET /api/inventory/reports/stock - État du stock avec alertes
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireRole(req, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status') // OK | LOW | OUT

    const products = await db.inventoryProduct.findMany({
      orderBy: { name: 'asc' },
    })

    let reports: StockReport[] = products.map((product) => {
      const status = getStockStatus(product.currentStock, product.minStock)

      return {
        productId: product.id,
        productName: product.name,
        productNameAr: product.nameAr,
        category: product.category,
        supplier: product.supplier,
        currentStock: product.currentStock,
        minStock: product.minStock,
        unit: product.unit,
        status,
      }
    })

    // Filtrer par status si demandé
    if (statusFilter) {
      reports = reports.filter((r) => r.status === statusFilter)
    }

    // Trier: OUT > LOW > OK, puis par nom
    reports.sort((a, b) => {
      const statusOrder = { OUT: 0, LOW: 1, OK: 2 }
      const statusDiff = statusOrder[a.status] - statusOrder[b.status]
      if (statusDiff !== 0) return statusDiff
      return a.productName.localeCompare(b.productName)
    })

    return NextResponse.json(reports)
  } catch (error) {
    console.error('[GET /api/inventory/reports/stock] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate stock report' },
      { status: 500 }
    )
  }
}
