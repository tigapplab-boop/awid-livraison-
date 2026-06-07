// ========================================
// AWID / BURGER MINUTE - Orders Temp Reject API Route
// PATCH /api/orders-temp/[token]/reject - Reject temp order (livreur)
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { getTempOrderByToken, updateTempOrderStatus } from '@/bm/lib/order-temp-store'
import { authenticateRequest, type JwtPayload } from '@/bm/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Auth required - LIVREUR or ADMIN
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) return authResult

    const user = authResult as JwtPayload

    if (user.role !== 'LIVREUR' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only livreurs can reject orders' },
        { status: 403 }
      )
    }

    const tempOrder = getTempOrderByToken(token)
    if (!tempOrder) {
      return NextResponse.json(
        { error: 'Temp order not found or expired' },
        { status: 404 }
      )
    }

    if (tempOrder.status !== 'PENDING' && tempOrder.status !== 'ACCEPTED') {
      return NextResponse.json(
        { error: 'Order is not in a rejectable status' },
        { status: 400 }
      )
    }

    updateTempOrderStatus(token, 'REJECTED')

    // Emit real-time socket event to client
    try {
      const { emitToRoom } = await import('@/bm/lib/socket')
      await emitToRoom('order:rejected', `client:${token}`, {
        reason: 'Order rejected by restaurant',
      })
    } catch (emitErr) {
      console.warn('[OrdersTemp/Reject] Socket emit failed (non-critical):', emitErr)
    }

    return NextResponse.json({ status: 'REJECTED' })
  } catch (error) {
    console.error('[OrdersTemp/Reject] PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
