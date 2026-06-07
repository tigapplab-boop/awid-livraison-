// ========================================
// AWID / BURGER MINUTE - Orders Temp Accept API Route
// PATCH /api/orders-temp/[token]/accept - Accept (claim) temp order (livreur)
// First livreur to accept claims the order; it disappears from other livreurs' views
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { getTempOrderByToken, acceptTempOrder } from '@/bm/lib/order-temp-store'
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
        { error: 'Only livreurs can accept orders' },
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

    if (tempOrder.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Order is not available for acceptance. It may have already been accepted by another livreur.' },
        { status: 409 }
      )
    }

    // Check expiry
    if (new Date(tempOrder.expiresAt) <= new Date()) {
      return NextResponse.json(
        { error: 'Order has expired' },
        { status: 400 }
      )
    }

    // Accept the order - assigns it to this livreur
    const acceptedOrder = acceptTempOrder(token, user.userId)
    if (!acceptedOrder) {
      return NextResponse.json(
        { error: 'Order could not be accepted. It may have already been claimed by another livreur.' },
        { status: 409 }
      )
    }

    // Emit real-time socket events
    try {
      const { emitToRoom } = await import('@/bm/lib/socket')
      // Notify all livreurs that this order was accepted (so they remove it from their view)
      await emitToRoom('order:accepted', 'livreur', {
        tempToken: token,
        acceptedByLivreurId: user.userId,
        acceptedByName: user.name || 'Livreur',
      })
      // Notify the client that a livreur has taken their order
      await emitToRoom('order:accepted_by_livreur', `client:${token}`, {
        livreurName: user.name || 'Livreur',
        message: 'Un livreur a pris votre commande, il vous appellera sous peu',
      })
      // Notify admins
      await emitToRoom('order:accepted', 'admin', {
        tempToken: token,
        acceptedByLivreurId: user.userId,
        acceptedByName: user.name || 'Livreur',
      })
    } catch (emitErr) {
      console.warn('[OrdersTemp/Accept] Socket emit failed (non-critical):', emitErr)
    }

    return NextResponse.json({
      order: acceptedOrder,
      message: 'Commande acceptée. Appelez le client pour vérifier, puis validez.',
    })
  } catch (error) {
    console.error('[OrdersTemp/Accept] PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
