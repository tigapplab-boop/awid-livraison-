'use client'

// ========================================
// AWID / BURGER MINUTE - Restaurant Closed Modal
// Shows when restaurant is closed with countdown
// ========================================

import { useState, useEffect } from 'react'
import { Clock, X } from 'lucide-react'
import { timeUntilOpening, formatCountdown } from '@/bm/lib/opening-hours'

interface ClosedModalProps {
  isOpen: boolean
  message: string
  messageAr: string
  nextOpening: Date | null
  onClose: () => void
  lang?: 'fr' | 'ar'
}

export default function ClosedModal({
  isOpen,
  message,
  messageAr,
  nextOpening,
  onClose,
  lang = 'fr',
}: ClosedModalProps) {
  const [countdown, setCountdown] = useState('')

  useEffect(() => {
    if (!isOpen || !nextOpening) return

    const updateCountdown = () => {
      const ms = timeUntilOpening(nextOpening)
      if (ms <= 0) {
        // Restaurant is now open, reload page
        window.location.reload()
      } else {
        setCountdown(formatCountdown(ms, lang))
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [isOpen, nextOpening, lang])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/20 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black">
                {lang === 'ar' ? 'نحن مغلقون' : 'Nous sommes fermés'}
              </h2>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Message */}
          <div className="text-center">
            <p className="text-lg text-stone-700 font-semibold">
              {lang === 'ar' ? messageAr : message}
            </p>
          </div>

          {/* Countdown */}
          {nextOpening && countdown && (
            <div className="bg-gradient-to-br from-bm-primary-50 to-amber-50 rounded-xl p-6 text-center border-2 border-bm-primary-100">
              <p className="text-sm text-stone-600 font-medium mb-2">
                {lang === 'ar' ? 'الوقت المتبقي للافتتاح' : 'Temps restant avant ouverture'}
              </p>
              <div className="text-4xl font-black text-bm-primary tracking-wider font-mono">
                {countdown}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <p className="text-sm text-blue-800 text-center">
              {lang === 'ar' 
                ? '💡 يمكنك تصفح القائمة الآن والطلب عند الفتح'
                : '💡 Vous pouvez consulter le menu maintenant et commander dès notre ouverture'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-900 font-bold py-3 px-4 rounded-xl transition-colors"
            >
              {lang === 'ar' ? 'تصفح القائمة' : 'Voir le menu'}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-bm-primary hover:bg-bm-primary-600 text-stone-900 font-bold py-3 px-4 rounded-xl transition-colors"
            >
              {lang === 'ar' ? 'تحديث' : 'Actualiser'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
