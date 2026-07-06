// ========================================
// AWID / BURGER MINUTE - Push Subscription API
// Manages push notification subscriptions
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/bm/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/notifications/subscribe
 * Subscribe a user to push notifications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { endpoint, keys, userId } = body

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      )
    }

    // If userId is provided, use it; otherwise try to get from auth
    let targetUserId = userId
    if (!targetUserId) {
      const authResult = await verifyAuth(request)
      if (!authResult.valid || !authResult.userId) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
      targetUserId = authResult.userId
    }

    // Check if subscription already exists
    const existing = await db.pushSubscription.findFirst({
      where: { endpoint },
    })

    if (existing) {
      // Update userId if different
      if (existing.userId !== targetUserId) {
        await db.pushSubscription.update({
          where: { id: existing.id },
          data: { userId: targetUserId },
        })
      }
      return NextResponse.json({ success: true, subscriptionId: existing.id })
    }

    // Create new subscription
    const subscription = await db.pushSubscription.create({
      data: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: targetUserId,
      },
    })

    console.log(`[Push] New subscription created for user ${targetUserId}: ${subscription.id}`)

    return NextResponse.json({ success: true, subscriptionId: subscription.id })
  } catch (error) {
    console.error('[Push Subscribe] Error:', error)
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/notifications/subscribe
 * Unsubscribe from push notifications
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      )
    }

    // Find and delete the subscription
    const subscription = await db.pushSubscription.findFirst({
      where: { endpoint },
    })

    if (subscription) {
      await db.pushSubscription.delete({
        where: { id: subscription.id },
      })
      console.log(`[Push] Subscription removed: ${subscription.id}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Push Unsubscribe] Error:', error)
    return NextResponse.json(
      { error: 'Failed to remove subscription' },
      { status: 500 }
    )
  }
}
