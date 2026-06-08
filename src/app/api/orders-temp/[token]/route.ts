// ========================================
// AWID / BURGER MINUTE - Orders Temp [token] API Route
// GET /api/orders-temp/[token] - Get temp order by token
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { getTempOrderByToken } from '@/bm/lib/order-temp-store'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const order = await getTempOrderByToken(token)

    if (!order) {
      return NextResponse.json(
        { error: 'Temp order not found or expired' },
        { status: 404 }
      )
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('[OrdersTemp/Token] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
