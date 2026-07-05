// ========================================
// API INVENTAIRE - Rapport Dettes par Fournisseur
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/bm/lib/auth'
import { db } from '@/lib/db'

interface DebtReport {
  supplier: string
  totalDebt: number
  purchaseCount: number
  purchases: any[]
  oldestPurchase: Date | null
}

// GET /api/inventory/reports/debts - Dettes par fournisseur
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireRole(req, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    // Récupérer tous les achats impayés
    const unpaidPurchases = await db.purchase.findMany({
      where: { isPaid: false },
      include: { product: true },
      orderBy: { purchaseDate: 'asc' },
    })

    // Grouper par fournisseur
    const debtsBySupplier = new Map<string, DebtReport>()

    unpaidPurchases.forEach((purchase) => {
      const supplier = purchase.supplier
      
      if (!debtsBySupplier.has(supplier)) {
        debtsBySupplier.set(supplier, {
          supplier,
          totalDebt: 0,
          purchaseCount: 0,
          purchases: [],
          oldestPurchase: null,
        })
      }

      const report = debtsBySupplier.get(supplier)!
      report.totalDebt += purchase.totalAmount
      report.purchaseCount++
      report.purchases.push(purchase)
      
      if (!report.oldestPurchase || purchase.purchaseDate < report.oldestPurchase) {
        report.oldestPurchase = purchase.purchaseDate
      }
    })

    // Convertir en array et trier par dette décroissante
    const reports = Array.from(debtsBySupplier.values())
      .sort((a, b) => b.totalDebt - a.totalDebt)

    return NextResponse.json(reports)
  } catch (error) {
    console.error('[GET /api/inventory/reports/debts] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate debts report' },
      { status: 500 }
    )
  }
}
