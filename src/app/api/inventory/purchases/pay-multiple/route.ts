// ========================================
// API INVENTAIRE - Payer plusieurs achats
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/inventory/purchases/pay-multiple - Payer plusieurs achats
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { purchaseIds, paymentMethod } = body

    if (!Array.isArray(purchaseIds) || purchaseIds.length === 0) {
      return NextResponse.json(
        { error: 'purchaseIds array is required' },
        { status: 400 }
      )
    }

    // Mettre à jour tous les achats
    const result = await db.purchase.updateMany({
      where: {
        id: { in: purchaseIds },
      },
      data: {
        isPaid: true,
        paidAt: new Date(),
        paymentMethod: paymentMethod || 'Espèces',
      },
    })

    console.log('[POST /api/inventory/purchases/pay-multiple] Paid', result.count, 'purchases')
    return NextResponse.json({ 
      success: true, 
      count: result.count 
    })
  } catch (error) {
    console.error('[POST /api/inventory/purchases/pay-multiple] Error:', error)
    return NextResponse.json(
      { error: 'Failed to pay multiple purchases' },
      { status: 500 }
    )
  }
}
