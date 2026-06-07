// ========================================
// AWID / BURGER MINUTE - Shared Format Utilities
// Single source of truth for formatting functions
// ========================================

/**
 * Format a price in centimes to DA display string.
 * Example: 45000 -> "450 DA"
 */
export function formatPrice(centimes: number | null | undefined): string {
  if (centimes == null) return '0 DA'
  return `${(centimes / 100).toFixed(0)} DA`
}

/**
 * Format a price in centimes to DA display string (alias for formatPrice).
 * Used by pages that call it formatDA or formatPrice interchangeably.
 */
export const formatDA = formatPrice

/**
 * Format a date string to a localized time string.
 * Example: "2024-01-15T14:30:00Z" -> "14:30"
 */
export function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Format a date string to a relative time ago string in French.
 * Example: 5 minutes ago -> "Il y a 5min"
 */
export function timeAgo(dateStr: string): string {
  const now = new Date()
  const d = new Date(dateStr)
  const diff = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diff < 1) return "À l'instant"
  if (diff < 60) return `Il y a ${diff}min`
  return `Il y a ${Math.floor(diff / 60)}h${diff % 60 > 0 ? diff % 60 + 'min' : ''}`
}

/**
 * Check if a given time falls within a night time range.
 * Handles overnight ranges (e.g., 22:00 to 06:00).
 * @param currentTime - Current time in "HH:MM" format
 * @param startNight - Night start time in "HH:MM" format
 * @param endNight - Night end time in "HH:MM" format
 */
export function isNightTime(currentTime: string, startNight: string, endNight: string): boolean {
  const [curH, curM] = currentTime.split(':').map(Number)
  const [startH, startM] = startNight.split(':').map(Number)
  const [endH, endM] = endNight.split(':').map(Number)

  const current = curH * 60 + curM
  const start = startH * 60 + startM
  const end = endH * 60 + endM

  // Handle overnight range (e.g., 22:00 to 06:00)
  if (start > end) {
    return current >= start || current <= end
  }

  // Normal range (e.g., 19:00 to 23:00)
  return current >= start && current <= end
}
