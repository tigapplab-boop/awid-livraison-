'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const dismissedRef = useRef(false)

  useEffect(() => {
    // Check if user previously dismissed (within 7 days)
    const dismissed = localStorage.getItem('bm_pwa_dismissed')
    if (dismissed && (Date.now() - parseInt(dismissed, 10) < 7 * 24 * 60 * 60 * 1000)) {
      dismissedRef.current = true
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show banner after a short delay for better UX
      setTimeout(() => {
        if (!dismissedRef.current) {
          setShowBanner(true)
        }
      }, 2000)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Listen for app installed event
    const installedHandler = () => {
      setShowBanner(false)
      setDeferredPrompt(null)
    }
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowBanner(false)
      }
    } catch {
      // Prompt failed, ignore
    }
    setDeferredPrompt(null)
  }, [deferredPrompt])

  const handleDismiss = useCallback(() => {
    setShowBanner(false)
    dismissedRef.current = true
    localStorage.setItem('bm_pwa_dismissed', Date.now().toString())
  }, [])

  if (!showBanner || !deferredPrompt) return null

  return (
    <div className="fixed bottom-16 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="mx-auto max-w-lg rounded-2xl bg-white shadow-xl border border-stone-200 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bm-primary text-stone-900">
            <Download className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-stone-900">Installer l&apos;application</h3>
            <p className="mt-0.5 text-xs text-stone-500">
              Ajoutez Burger Minute à votre écran d&apos;accueil pour un accès rapide
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={handleDismiss}
            className="flex-1 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors min-h-[44px]"
          >
            Plus tard
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 rounded-xl bg-bm-primary px-4 py-2.5 text-sm font-bold text-stone-900 shadow-sm hover:bg-bm-primary-600 transition-colors min-h-[44px]"
          >
            Installer
          </button>
        </div>
      </div>
    </div>
  )
}
