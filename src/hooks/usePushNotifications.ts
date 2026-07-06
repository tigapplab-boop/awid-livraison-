import { useState, useEffect } from 'react'

interface UsePushNotificationsReturn {
  isSupported: boolean
  permission: NotificationPermission
  isSubscribed: boolean
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
}

// Le navigateur exige que la clé VAPID soit passée sous forme d'octets bruts
// (Uint8Array), pas sous forme de texte — c'est une exigence standard de
// l'API Push (voir la documentation MDN sur PushManager.subscribe). Avant ce
// correctif, la clé texte était envoyée telle quelle, ce qui fait échouer
// l'abonnement à chaque fois, silencieusement (capturé par le try/catch plus
// bas) : aucune notification ne pouvait donc jamais être reçue.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
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

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        console.error(
          '[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY est manquante — impossible de s\'abonner. ' +
          'Cette variable doit être définie AU MOMENT DE LA COMPILATION (build), pas seulement à l\'exécution.'
        )
        return
      }

      // S'abonner aux push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
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
