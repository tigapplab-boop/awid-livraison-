// ========================================
// API INVENTAIRE - Rapport Résumé Global
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { calculateProfit, getStockStatus } from '@/lib/inventory/calculations'

interface SummaryReport {
  totalProducts: number
  totalSuppliers: number
  totalPurchasesThisMonth: number
  totalPurchasesAmountThisMonth: number
  totalDebts: number
  totalUnpaidPurchases: number
  potentialProfit: number
  lowStockAlerts: number
  outOfStockAlerts: number
  topSupplierByDebt: string | null
  topProductByProfit: string | null
}

// GET /api/inventory/reports/summary - Résumé global
export async function GET(req: NextRequest) {
  try {
    // Produits
    const products = await db.inventoryProduct.findMany()
    const totalProducts = products.length

    // Fournisseurs uniques
    const suppliers = new Set(products.map((p) => p.supplier))
    const totalSuppliers = suppliers.size

    // Achats ce mois
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const purchasesThisMonth = await db.purchase.findMany({
      where: {
        purchaseDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    })

    const totalPurchasesThisMonth = purchasesThisMonth.length
    const totalPurchasesAmountThisMonth = purchasesThisMonth.reduce(
      (sum, p) => sum + p.totalAmount,
      0
    )

    // Dettes
    const unpaidPurchases = await db.purchase.findMany({
      where: { isPaid: false },
    })

    const totalUnpaidPurchases = unpaidPurchases.length
    const totalDebts = unpaidPurchases.reduce((sum, p) => sum + p.totalAmount, 0)

    // Dettes par fournisseur
    const debtsBySupplier = new Map<string, number>()
    unpaidPurchases.forEach((p) => {
      const current = debtsBySupplier.get(p.supplier) || 0
      debtsBySupplier.set(p.supplier, current + p.totalAmount)
    })
    const topSupplierByDebt = debtsBySupplier.size > 0
      ? Array.from(debtsBySupplier.entries())
          .sort((a, b) => b[1] - a[1])[0][0]
      : null

    // Bénéfices potentiels
    let potentialProfit = 0
    let topProductProfit = { name: '', profit: 0 }

    products.forEach((product) => {
      const { totalProfit } = calculateProfit(
        product.purchasePrice,
        product.sellingPrice,
        product.currentStock
      )
      potentialProfit += totalProfit

      if (totalProfit > topProductProfit.profit) {
        topProductProfit = { name: product.name, profit: totalProfit }
      }
    })

    // Alertes stock
    let lowStockAlerts = 0
    let outOfStockAlerts = 0

    products.forEach((product) => {
      const status = getStockStatus(product.currentStock, product.minStock)
      if (status === 'LOW') lowStockAlerts++
      if (status === 'OUT') outOfStockAlerts++
    })

    const summary: SummaryReport = {
      totalProducts,
      totalSuppliers,
      totalPurchasesThisMonth,
      totalPurchasesAmountThisMonth,
      totalDebts,
      totalUnpaidPurchases,
      potentialProfit,
      lowStockAlerts,
      outOfStockAlerts,
      topSupplierByDebt,
      topProductByProfit: topProductProfit.name || null,
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error('[GET /api/inventory/reports/summary] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate summary report' },
      { status: 500 }
    )
  }
}
