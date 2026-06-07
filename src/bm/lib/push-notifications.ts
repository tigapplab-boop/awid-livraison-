// ========================================
// AWID / BURGER MINUTE - Client Push Notification Library
// Browser-side push subscription management using VAPID
// ========================================

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BBoM99E14LHPIR5nVL9h8YkWUCuWbKpIijoJvElMlHx67WZEYzqagEO74eav3ic84ORSGW5WeJuua58vhhzC0Xk'

/** Convert a base64 string to a Uint8Array for the push manager */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export interface PushSubscriptionPayload {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  userId?: string
}

/**
 * Subscribe the browser to push notifications and send the subscription to the backend.
 * Returns the subscription object on success, or null on failure.
 */
export async function subscribePush(userId?: string): Promise<PushSubscriptionPayload | null> {
  try {
    if (!('serviceWorker' in navigator)) {
      console.warn('[Push] Service workers are not supported in this browser')
      return null
    }

    if (!('PushManager' in window)) {
      console.warn('[Push] Push notifications are not supported in this browser')
      return null
    }

    // Request notification permission
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.warn('[Push] Notification permission denied')
      return null
    }

    // Wait for service worker to be ready
    const registration = await navigator.serviceWorker.ready

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
    })

    // Serialize the subscription
    const payload: PushSubscriptionPayload = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.toJSON().keys?.p256dh ?? '',
        auth: subscription.toJSON().keys?.auth ?? '',
      },
      ...(userId ? { userId } : {}),
    }

    // Send to backend
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.error('[Push] Failed to save subscription on server:', await response.text())
      return null
    }

    return payload
  } catch (error) {
    console.error('[Push] Error subscribing to push notifications:', error)
    return null
  }
}

/**
 * Unsubscribe the browser from push notifications and notify the backend.
 * Returns true on success, false on failure.
 */
export async function unsubscribePush(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) {
      return false
    }

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      // Already unsubscribed
      return true
    }

    // Unsubscribe from the push service
    const unsubscribed = await subscription.unsubscribe()
    if (!unsubscribed) {
      console.error('[Push] Failed to unsubscribe from push service')
      return false
    }

    // Notify backend to remove the subscription
    const response = await fetch('/api/notifications/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    })

    if (!response.ok) {
      console.warn('[Push] Failed to remove subscription from server, but browser is unsubscribed')
    }

    return true
  } catch (error) {
    console.error('[Push] Error unsubscribing from push notifications:', error)
    return false
  }
}

/**
 * Check if the browser is currently subscribed to push notifications.
 */
export async function isPushSubscribed(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) {
      return false
    }

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return subscription !== null
  } catch {
    return false
  }
}
