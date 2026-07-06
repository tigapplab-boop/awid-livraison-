/**
 * Compression d'images côté client (navigateur)
 * Réduit la taille des photos avant upload — aucune limite de taille pour l'utilisateur
 * Cible : ≤ 1200px de large, qualité JPEG 0.82, max ~300 Ko
 */

export interface CompressOptions {
  maxWidth?: number   // px — défaut 1200
  maxHeight?: number  // px — défaut 1200
  quality?: number    // 0-1 — défaut 0.82
  mimeType?: string   // défaut image/jpeg
}

/**
 * Compresse un File image dans le navigateur via Canvas.
 * Retourne un nouveau File compressé.
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.82,
    mimeType = 'image/jpeg',
  } = options

  // GIF non compressés (animation perdue sinon)
  if (file.type === 'image/gif') return file

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img

      // Redimensionner si nécessaire en conservant le ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas context unavailable'))
        return
      }

      // Fond blanc pour les PNG transparents convertis en JPEG
      if (mimeType === 'image/jpeg') {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
      }

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas toBlob failed'))
            return
          }
          // Garder le nom original mais avec la bonne extension
          const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1]
          const name = file.name.replace(/\.[^.]+$/, '') + '.' + ext
          resolve(new File([blob], name, { type: mimeType, lastModified: Date.now() }))
        },
        mimeType,
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image load failed'))
    }

    img.src = url
  })
}

/**
 * Compresse et retourne un FormData prêt pour l'upload.
 * Affiche la réduction de taille dans la console (debug).
 */
export async function compressAndPrepare(
  file: File,
  fieldName = 'image',
  options?: CompressOptions
): Promise<FormData> {
  const compressed = await compressImage(file, options)

  if (process.env.NODE_ENV === 'development') {
    const ratio = ((1 - compressed.size / file.size) * 100).toFixed(1)
    console.log(
      `[ImageCompress] ${file.name}: ${(file.size / 1024).toFixed(0)} Ko → ${(compressed.size / 1024).toFixed(0)} Ko (−${ratio}%)`
    )
  }

  const form = new FormData()
  form.append(fieldName, compressed)
  return form
}
