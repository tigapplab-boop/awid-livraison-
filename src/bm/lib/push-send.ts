// ========================================
// AWID / BURGER MINUTE - Server-side Push Helper
// Configures web-push with VAPID keys and provides
// helper functions to send push notifications
// ========================================

import webpush from 'web-push'
import { db } from '@/lib/db'

// Configure web-push with VAPID credentials
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:contact@burgerminute.dz'
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || ''
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ''

if (vapidPublicKey && vapidPrivateKey && vapidPublicKey !== 'undefined' && vapidPrivateKey !== 'undefined') {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
  } catch (error) {
    console.error('[Push] Failed to set VAPID details:', error instanceof Error ? error.message : error)
  }
} else {
  console.warn(
    '[Push] VAPID keys not configured or invalid. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env'
  )
}

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  image?: string
  data?: Record<string, unknown>
  actions?: Array<{ action: string; title: string; icon?: string }>
  tag?: string
  requireInteraction?: boolean
}

/**
 * Send a push notification to a specific user (all their subscriptions).
 * Automatically removes invalid/expired subscriptions from the database.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  const subscriptions = await db.pushSubscription.findMany({
    where: { userId },
  })

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 }
  }

  let sent = 0
  let failed = 0

  const pushPayload = JSON.stringify(payload)

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        pushPayload
      )
      sent++
    } catch (error: unknown) {
      failed++

      // Check if subscription is invalid and should be removed
      const shouldRemove =
        error instanceof Error &&
        'statusCode' in error &&
        (
          (error as webpush.WebPushError).statusCode === 410 || // Gone
          (error as webpush.WebPushError).statusCode === 404 || // Not Found
          (error as webpush.WebPushError).statusCode === 400    // Bad Request (malformed)
        )

      if (shouldRemove) {
        const statusCode = (error as webpush.WebPushError).statusCode
        console.log(`[Push] Removing invalid subscription ${sub.id} (status ${statusCode})`)
        await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {
          // Silently ignore deletion errors
        })
      } else {
        // Log the error with status code if available
        const statusCode = error instanceof Error && 'statusCode' in error
          ? (error as webpush.WebPushError).statusCode
          : 'unknown'
        console.error(
          `[Push] Failed to send notification to subscription ${sub.id} (status ${statusCode}):`,
          error instanceof Error ? error.message : error
        )
      }
    }
  }

  return { sent, failed }
}

/**
 * Send a push notification to all registered subscriptions.
 * Only sends to users with isAvailable = true (active livreurs).
 * Automatically removes invalid/expired subscriptions from the database.
 */
export async function sendPushToAll(
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  // Only get subscriptions for users who are available (isAvailable = true)
  const subscriptions = await db.pushSubscription.findMany({
    where: {
      user: {
        isAvailable: true,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          isAvailable: true,
        },
      },
    },
  })

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 }
  }

  let sent = 0
  let failed = 0

  const pushPayload = JSON.stringify(payload)

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        pushPayload
      )
      sent++
    } catch (error: unknown) {
      failed++

      // Check if subscription is invalid and should be removed
      const shouldRemove =
        error instanceof Error &&
        'statusCode' in error &&
        (
          (error as webpush.WebPushError).statusCode === 410 || // Gone
          (error as webpush.WebPushError).statusCode === 404 || // Not Found
          (error as webpush.WebPushError).statusCode === 400    // Bad Request (malformed)
        )

      if (shouldRemove) {
        const statusCode = (error as webpush.WebPushError).statusCode
        console.log(`[Push] Removing invalid subscription ${sub.id} (status ${statusCode})`)
        await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {
          // Silently ignore deletion errors
        })
      } else {
        // Log the error with status code if available
        const statusCode = error instanceof Error && 'statusCode' in error
          ? (error as webpush.WebPushError).statusCode
          : 'unknown'
        console.error(
          `[Push] Failed to send notification to subscription ${sub.id} (status ${statusCode}):`,
          error instanceof Error ? error.message : error
        )
      }
    }
  }

  return { sent, failed }
}
