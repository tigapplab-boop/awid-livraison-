// ========================================
// AWID / BURGER MINUTE - Orders Temp Check API Route
// GET /api/orders-temp/check?phone=xxx
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { getPendingOrderByPhone } from '@/bm/lib/order-temp-store'

export async function GET(request: NextRequest) {
  try {
    const phone = request.nextUrl.searchParams.get('phone')

    if (!phone) {
      return NextResponse.json(
        { error: 'phone query parameter is required' },
        { status: 400 }
      )
    }

    const order = await getPendingOrderByPhone(phone)

    return NextResponse.json({
      hasPending: order !== null && order.status === 'PENDING',
      order: order && order.status === 'PENDING' ? order : null,
    })
  } catch (error) {
    console.error('[OrdersTemp/Check] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
