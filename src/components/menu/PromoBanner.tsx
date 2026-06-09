'use client'

import { useEffect, useState } from 'react'
import type { Locale } from '@/lib/locale'

interface PromoSettings {
  enabled: boolean
  text: string
  textAr: string
  bgColor: string
}

export function PromoBanner({ locale }: { locale: Locale }) {
  const isRTL = locale === 'ar'
  const [promo, setPromo] = useState<PromoSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings/promo')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setPromo(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Ne rien afficher si désactivé ou en chargement
  if (loading || !promo || !promo.enabled) {
    return null
  }

  const text = isRTL ? promo.textAr : promo.text

  return (
    <div 
      className="mx-4 mt-4 mb-2 rounded-2xl overflow-hidden text-stone-900 p-4 relative shadow-sm"
      style={{ background: `linear-gradient(to right, ${promo.bgColor}, #FF8C00)` }}
    >
      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className="text-4xl animate-bounce drop-shadow-sm">🎉</div>
        <div className="flex-1">
          <p className="text-[11px] font-bold opacity-80 uppercase tracking-wider mb-0.5">
            {isRTL ? 'عرض اليوم' : 'PROMO DU JOUR'}
          </p>
          <p className="text-[15px] font-bold leading-tight">
            {text}
          </p>
        </div>
      </div>
      {/* Decorative background circle */}
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-white opacity-10 rounded-full" />
      <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-white opacity-10 rounded-full" />
    </div>
  )
}
