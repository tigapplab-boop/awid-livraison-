// DELETE /api/settings/restaurant-info/gallery-delete
// Supprime une photo de la galerie (du disque + du tableau en DB)

import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/bm/lib/auth'
import { db } from '@/lib/db'
import { unlink } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './public/uploads'

export async function DELETE(req: NextRequest) {
  try {
    const authResult = await requireRole(req, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    const { url } = await req.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL manquante' }, { status: 400 })
    }

    // Supprimer le fichier physique si c'est un fichier local
    const filename = path.basename(url)
    // Sécurité : le nom ne doit pas contenir de traversal
    if (filename.includes('..') || filename.includes('/')) {
      return NextResponse.json({ error: 'Nom de fichier invalide' }, { status: 400 })
    }

    const filepath = path.join(UPLOAD_DIR, filename)
    if (existsSync(filepath)) {
      await unlink(filepath).catch(() => {}) // ignore si déjà supprimé
    }

    // Retirer l'URL du tableau gallery en DB
    const setting = await db.systemSettings.findUnique({
      where: { key: 'RESTAURANT_INFO' },
    })

    if (setting) {
      const info = JSON.parse(setting.value)
      info.gallery = (info.gallery || []).filter((u: string) => u !== url)
      await db.systemSettings.update({
        where: { key: 'RESTAURANT_INFO' },
        data: { value: JSON.stringify(info), updatedAt: new Date() },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE gallery-delete] Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
