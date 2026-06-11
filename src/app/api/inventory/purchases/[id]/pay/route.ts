// ========================================
// API INVENTAIRE - Marquer un achat comme payé
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/inventory/purchases/[id]/pay - Marquer payé
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await req.json()
    const { paymentMethod } = body

    const purchase = await db.purchase.update({
      where: { id },
      data: {
        isPaid: true,
        paidAt: new Date(),
        paymentMethod: paymentMethod || 'Espèces',
      },
    })

    console.log('[POST /api/inventory/purchases/:id/pay] Marked as paid:', purchase.purchaseNumber)
    return NextResponse.json(purchase)
  } catch (error) {
    console.error('[POST /api/inventory/purchases/:id/pay] Error:', error)
    return NextResponse.json(
      { error: 'Failed to mark purchase as paid' },
      { status: 500 }
    )
  }
}
