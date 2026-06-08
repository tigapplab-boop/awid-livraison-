'use client'

import { useLocale } from '@/lib/locale'

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  const { locale, isRTL, changeLocale, isMounted } = useLocale()

  if (!isMounted) return null

  return (
    <div 
      dir={isRTL ? 'rtl' : 'ltr'}
      lang={locale}
      className={`
        min-h-screen bg-bm-bg
        ${isRTL ? 'font-cairo' : 'font-sans'}
      `}
    >
      {/* Toggle langue (subtil, en haut à droite) */}
      <div className="absolute top-3 right-4 z-50">
        <button
          onClick={() => changeLocale(isRTL ? 'fr' : 'ar')}
          className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] font-bold text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-white shadow-sm transition-all"
        >
          {isRTL ? 'FR' : 'عربي'}
        </button>
      </div>

      {children}
    </div>
  )
}
