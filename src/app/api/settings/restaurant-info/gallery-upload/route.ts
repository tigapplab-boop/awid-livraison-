// POST /api/settings/restaurant-info/gallery-upload
// Reçoit une image déjà compressée côté client, la sauvegarde, renvoie son URL.
// Pas de limite de taille ici — la compression est faite en amont dans le navigateur.

import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/bm/lib/auth'
import { db } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './public/uploads'
// Limite côté serveur : 10 Mo (protection contre les abus, la compression ramène
// généralement une photo de smartphone à < 300 Ko)
const MAX_SIZE = 10 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireRole(req, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    const formData = await req.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Aucune image fournie' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Le fichier doit être une image' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `Image trop grande après compression (${(file.size / 1024 / 1024).toFixed(1)} Mo > 10 Mo)` },
        { status: 400 }
      )
    }

    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true })
    }

    const timestamp = Date.now()
    const random = Math.round(Math.random() * 1e6)
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
    const filename = `gallery-${timestamp}-${random}.${ext}`
    const filepath = path.join(UPLOAD_DIR, filename)

    const bytes = await file.arrayBuffer()
    await writeFile(filepath, Buffer.from(bytes))

    // Ajouter l'URL directement en DB pour que le client la voie immédiatement
    const imageUrl = `/uploads/${filename}`
    const setting = await db.systemSettings.findUnique({
      where: { key: 'RESTAURANT_INFO' },
    })

    if (setting) {
      const info = JSON.parse(setting.value)
      info.gallery = [...(info.gallery || []), imageUrl]
      await db.systemSettings.update({
        where: { key: 'RESTAURANT_INFO' },
        data: { value: JSON.stringify(info), updatedAt: new Date() },
      })
    }
    // Si pas encore de RESTAURANT_INFO, l'URL est retournée et sera sauvegardée
    // lors du prochain clic sur "Enregistrer" côté admin.

    return NextResponse.json({ url: imageUrl })
  } catch (error) {
    console.error('[POST gallery-upload] Error:', error)
    return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 })
  }
}
