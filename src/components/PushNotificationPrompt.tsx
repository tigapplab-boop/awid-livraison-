'use client'

import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export default function PushNotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const { isSupported, permission, subscribe } = usePushNotifications()

  useEffect(() => {
    // Don't show if not supported or already granted/denied
    if (!isSupported || permission !== 'default') return

    // Check if user has dismissed the prompt before
    const dismissed = localStorage.getItem('bm_push_dismissed')
    if (dismissed) return

    // Show prompt after 5 seconds
    const timer = setTimeout(() => {
      setShowPrompt(true)
    }, 5000)

    return () => clearTimeout(timer)
  }, [isSupported, permission])

  const handleAllow = async () => {
    await subscribe()
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    localStorage.setItem('bm_push_dismissed', 'true')
    setShowPrompt(false)
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 animate-in slide-in-from-bottom-4">
      <div className="bg-white rounded-xl shadow-2xl border border-stone-200 p-4 max-w-md mx-auto">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 hover:bg-stone-100 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-stone-400" />
        </button>

        <div className="flex gap-3">
          <div className="w-10 h-10 bg-bm-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-bm-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-stone-900 mb-1">
              Activer les notifications ?
            </h3>
            <p className="text-sm text-stone-600 mb-3">
              Recevez des alertes pour le suivi de vos commandes
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleAllow}
                className="flex-1 bg-bm-primary text-stone-900 px-4 py-2 rounded-lg font-semibold hover:bg-bm-primary/90 transition-colors text-sm"
              >
                Autoriser
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg font-semibold transition-colors text-sm"
              >
                Plus tard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
