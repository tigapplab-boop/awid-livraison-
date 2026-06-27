import { useState, useEffect } from 'react'

interface UsePushNotificationsReturn {
  isSupported: boolean
  permission: NotificationPermission
  isSubscribed: boolean
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    setIsSupported('serviceWorker' in navigator && 'PushManager' in window)
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  const subscribe = async () => {
    if (!isSupported) {
      console.warn('Push notifications not supported')
      return
    }

    try {
      // Demander la permission
      const perm = await Notification.requestPermission()
      setPermission(perm)

      if (perm !== 'granted') {
        console.warn('Notification permission denied')
        return
      }

      // Récupérer le service worker
      const registration = await navigator.serviceWorker.ready

      // S'abonner aux push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })

      // Envoyer l'abonnement au serveur
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
            auth: arrayBufferToBase64(subscription.getKey('auth')),
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to subscribe')
      }

      setIsSubscribed(true)
      console.log('Push subscription successful')
    } catch (error) {
      console.error('Push subscription error:', error)
    }
  }

  const unsubscribe = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()

        // Notifier le serveur
        await fetch('/api/notifications/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })

        setIsSubscribed(false)
        console.log('Push unsubscription successful')
      }
    } catch (error) {
      console.error('Push unsubscription error:', error)
    }
  }

  return {
    isSupported,
    permission,
    isSubscribed,
    subscribe,
    unsubscribe,
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}
