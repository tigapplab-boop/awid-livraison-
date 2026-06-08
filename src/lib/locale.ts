import { useState, useEffect } from 'react'

export type Locale = 'fr' | 'ar'

export function detectLocale(): Locale {
  // 1. Vérifier localStorage (préférence utilisateur sauvegardée)
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('bm_locale') as Locale | null
    if (saved && (saved === 'fr' || saved === 'ar')) return saved

    // 2. Détecter la langue du navigateur
    const browserLang = navigator.language.toLowerCase()
    if (browserLang.startsWith('ar')) return 'ar'

    // 3. Détecter la langue du système Android/iOS
    // @ts-ignore
    const deviceLang = window.navigator.userLanguage || navigator.language
    if (deviceLang?.toLowerCase().startsWith('ar')) return 'ar'
  }

  return 'fr' // Default
}

export function setLocale(locale: Locale) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('bm_locale', locale)
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = locale
  }
}

// Hook React
export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>('fr')
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const detected = detectLocale()
    setLocaleState(detected)
    setLocale(detected)
  }, [])

  const changeLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    setLocale(newLocale)
    window.location.reload() // Reload pour appliquer RTL/LTR
  }

  return { locale, isRTL: locale === 'ar', changeLocale, isMounted }
}
