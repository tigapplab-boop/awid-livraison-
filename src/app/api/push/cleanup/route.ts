// ========================================
// AWID / BURGER MINUTE - Push Cleanup API
// Removes all invalid push subscriptions
// ========================================

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import webpush from 'web-push'

export const dynamic = 'force-dynamic'

/**
 * POST /api/push/cleanup
 * Tests all push subscriptions and removes invalid ones
 */
export async function POST() {
  try {
    const subscriptions = await db.pushSubscription.findMany()
    
    let removed = 0
    let valid = 0
    
    for (const sub of subscriptions) {
      try {
        // Send a test notification (empty payload)
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          JSON.stringify({
            title: 'Test',
            body: 'Subscription validation',
            tag: 'test-notification',
          })
        )
        valid++
      } catch (error: unknown) {
        // Remove invalid subscription
        const shouldRemove =
          error instanceof Error &&
          'statusCode' in error &&
          (
            (error as webpush.WebPushError).statusCode === 410 || // Gone
            (error as webpush.WebPushError).statusCode === 404 || // Not Found
            (error as webpush.WebPushError).statusCode === 400    // Bad Request
          )

        if (shouldRemove) {
          await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
          removed++
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      total: subscriptions.length,
      valid,
      removed,
    })
  } catch (error) {
    console.error('[Push Cleanup] Error:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup subscriptions' },
      { status: 500 }
    )
  }
}
