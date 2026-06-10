// ========================================
// AWID / BURGER MINUTE - Opening Hours Utils
// Check if restaurant is open + calculate next opening time
// ========================================

export interface DayHours {
  open: string
  close: string
  closed: boolean
}

export interface OpeningHours {
  enabled: boolean
  monday: DayHours
  tuesday: DayHours
  wednesday: DayHours
  thursday: DayHours
  friday: DayHours
  saturday: DayHours
  sunday: DayHours
}

export interface OpeningStatus {
  isOpen: boolean
  message: string
  messageAr: string
  nextOpening: Date | null
  currentDay: string
  currentTime: string
}

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

/**
 * Parse time string to minutes since midnight
 */
function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Check if restaurant is currently open
 */
export function isRestaurantOpen(hours: OpeningHours, now: Date = new Date()): OpeningStatus {
  // If feature is disabled, always open
  if (!hours.enabled) {
    return {
      isOpen: true,
      message: 'Ouvert',
      messageAr: 'مفتوح',
      nextOpening: null,
      currentDay: DAYS_FR[now.getDay()],
      currentTime: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    }
  }

  const dayIndex = now.getDay()
  const dayName = DAYS[dayIndex] as keyof OpeningHours
  const todayHours = hours[dayName] as DayHours

  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  // Check if today is closed
  if (todayHours.closed) {
    const nextOpening = findNextOpening(hours, now)
    return {
      isOpen: false,
      message: `Fermé aujourd'hui. Ouverture ${nextOpening ? formatNextOpening(nextOpening) : 'prochainement'}`,
      messageAr: `مغلق اليوم. سيفتح ${nextOpening ? formatNextOpeningAr(nextOpening) : 'قريباً'}`,
      nextOpening,
      currentDay: DAYS_FR[dayIndex],
      currentTime: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    }
  }

  const openMinutes = parseTime(todayHours.open)
  const closeMinutes = parseTime(todayHours.close)

  // Check if currently open
  if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
    return {
      isOpen: true,
      message: `Ouvert jusqu'à ${todayHours.close}`,
      messageAr: `مفتوح حتى ${todayHours.close}`,
      nextOpening: null,
      currentDay: DAYS_FR[dayIndex],
      currentTime: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    }
  }

  // Restaurant is closed, find next opening
  const nextOpening = findNextOpening(hours, now)
  
  return {
    isOpen: false,
    message: `Fermé. Ouverture ${nextOpening ? formatNextOpening(nextOpening) : 'prochainement'}`,
    messageAr: `مغلق. سيفتح ${nextOpening ? formatNextOpeningAr(nextOpening) : 'قريباً'}`,
    nextOpening,
    currentDay: DAYS_FR[dayIndex],
    currentTime: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  }
}

/**
 * Find next opening time
 */
function findNextOpening(hours: OpeningHours, now: Date): Date | null {
  const currentDayIndex = now.getDay()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  // Check if opening later today
  const todayName = DAYS[currentDayIndex] as keyof OpeningHours
  const todayHours = hours[todayName] as DayHours
  
  if (!todayHours.closed) {
    const openMinutes = parseTime(todayHours.open)
    if (currentMinutes < openMinutes) {
      const nextOpening = new Date(now)
      const [hours, minutes] = todayHours.open.split(':').map(Number)
      nextOpening.setHours(hours, minutes, 0, 0)
      return nextOpening
    }
  }

  // Check next 7 days
  for (let i = 1; i <= 7; i++) {
    const nextDayIndex = (currentDayIndex + i) % 7
    const nextDayName = DAYS[nextDayIndex] as keyof OpeningHours
    const nextDayHours = hours[nextDayName] as DayHours

    if (!nextDayHours.closed) {
      const nextOpening = new Date(now)
      nextOpening.setDate(now.getDate() + i)
      const [hours, minutes] = nextDayHours.open.split(':').map(Number)
      nextOpening.setHours(hours, minutes, 0, 0)
      return nextOpening
    }
  }

  return null
}

/**
 * Format next opening in French
 */
function formatNextOpening(date: Date): string {
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const dayName = DAYS_FR[date.getDay()]

  if (diffDays === 0) {
    return `aujourd'hui à ${timeStr}`
  } else if (diffDays === 1) {
    return `demain à ${timeStr}`
  } else {
    return `${dayName} à ${timeStr}`
  }
}

/**
 * Format next opening in Arabic
 */
function formatNextOpeningAr(date: Date): string {
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  const timeStr = date.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })
  const dayName = DAYS_AR[date.getDay()]

  if (diffDays === 0) {
    return `اليوم في ${timeStr}`
  } else if (diffDays === 1) {
    return `غداً في ${timeStr}`
  } else {
    return `${dayName} في ${timeStr}`
  }
}

/**
 * Calculate time remaining until next opening (in milliseconds)
 */
export function timeUntilOpening(nextOpening: Date | null): number {
  if (!nextOpening) return 0
  return Math.max(0, nextOpening.getTime() - Date.now())
}

/**
 * Format milliseconds to readable countdown
 */
export function formatCountdown(ms: number, lang: 'fr' | 'ar' = 'fr'): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (lang === 'ar') {
    if (days > 0) {
      return `${days} يوم ${hours % 24} ساعة`
    } else if (hours > 0) {
      return `${hours} ساعة ${minutes % 60} دقيقة`
    } else if (minutes > 0) {
      return `${minutes} دقيقة ${seconds % 60} ثانية`
    } else {
      return `${seconds} ثانية`
    }
  }

  if (days > 0) {
    return `${days}j ${hours % 24}h`
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}min`
  } else if (minutes > 0) {
    return `${minutes}min ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}
