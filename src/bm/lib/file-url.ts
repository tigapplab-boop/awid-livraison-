/**
 * Convertit une URL stockée en DB (/uploads/...) vers l'URL de service (/api/files/...)
 * Compatible avec le routing Docker où les fichiers ne sont pas servis en static.
 */
export function toFileUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (url.startsWith('/uploads/')) {
    return `/api/files/${url.replace('/uploads/', '')}`
  }
  return url
}
