// ========================================
// AWID / BURGER MINUTE - Upload de photo pour la galerie du restaurant
// POST /api/settings/restaurant-info/gallery-upload
// Reçoit un fichier image, le sauvegarde sur disque, renvoie son URL.
// Le frontend ajoute ensuite cette URL au tableau "gallery" et enregistre
// via PATCH /api/settings/restaurant-info (comme avant, mais plus besoin
// de taper une URL à la main).
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/bm/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './public/uploads'

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

    // Même limite que la photo de couverture (5 Mo)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image trop grande (max 5 Mo)' }, { status: 400 })
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
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    const imageUrl = `/uploads/${filename}`

    return NextResponse.json({ url: imageUrl })
  } catch (error) {
    console.error('[POST /api/settings/restaurant-info/gallery-upload] Error:', error)
    return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 })
  }
}
