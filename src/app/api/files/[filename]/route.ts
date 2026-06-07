// ========================================
// AWID / BURGER MINUTE - File Serving API
// GET /api/files/[filename] - Serve uploaded files
// Works with UPLOAD_DIR env var for Docker compatibility
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

function getUploadDir(): string {
  return process.env.UPLOAD_DIR || join(process.cwd(), 'public', 'uploads')
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params

    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Nom de fichier invalide' }, { status: 400 })
    }

    const uploadsDir = getUploadDir()
    const filepath = join(uploadsDir, filename)

    // Check file exists
    if (!existsSync(filepath)) {
      return NextResponse.json({ error: 'Fichier non trouvé' }, { status: 404 })
    }

    // Read the file
    const fileBuffer = await readFile(filepath)

    // Determine content type
    const ext = '.' + filename.split('.').pop()?.toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    // Get file stats for caching
    const fileStat = await stat(filepath)

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': fileBuffer.length.toString(),
        'Last-Modified': fileStat.mtime.toUTCString(),
      },
    })
  } catch (error) {
    console.error('[Files] Error serving file:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement du fichier' }, { status: 500 })
  }
}
