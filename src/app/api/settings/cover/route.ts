// ========================================
// AWID / BURGER MINUTE - Cover Image API
// Gestion de la photo de couverture du menu
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/bm/lib/auth';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './public/uploads';
const COVER_KEY = 'COVER_IMAGE';

// GET - Récupérer la photo de couverture actuelle
export async function GET() {
  try {
    const setting = await db.systemSettings.findUnique({
      where: { key: COVER_KEY },
    });

    if (!setting) {
      return NextResponse.json({ coverImage: null, enabled: false });
    }

    const data = JSON.parse(setting.value);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[GET /api/settings/cover] Error:', error);
    return NextResponse.json(
      { coverImage: null, enabled: false },
      { status: 500 }
    );
  }
}

// POST - Upload nouvelle photo de couverture
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = await verifyToken(token);

    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'Aucune image fournie' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Le fichier doit être une image' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image trop grande (max 5MB)' }, { status: 400 });
    }

    // Delete old cover image if exists
    const oldSetting = await db.systemSettings.findUnique({
      where: { key: COVER_KEY },
    });

    if (oldSetting) {
      try {
        const oldData = JSON.parse(oldSetting.value);
        if (oldData.coverImage) {
          const oldPath = path.join(UPLOAD_DIR, path.basename(oldData.coverImage));
          await unlink(oldPath);
        }
      } catch (err) {
        console.error('[POST /api/settings/cover] Error deleting old image:', err);
      }
    }

    // Save new image
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const filename = `cover-${timestamp}.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    const imageUrl = `/uploads/${filename}`;

    // Save to database
    await db.systemSettings.upsert({
      where: { key: COVER_KEY },
      create: {
        key: COVER_KEY,
        value: JSON.stringify({
          coverImage: imageUrl,
          enabled: true,
        }),
      },
      update: {
        value: JSON.stringify({
          coverImage: imageUrl,
          enabled: true,
        }),
      },
    });

    return NextResponse.json({
      coverImage: imageUrl,
      enabled: true,
    });
  } catch (error) {
    console.error('[POST /api/settings/cover] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload' },
      { status: 500 }
    );
  }
}

// PATCH - Toggle enable/disable cover
export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = await verifyToken(token);

    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { enabled } = await req.json();

    const setting = await db.systemSettings.findUnique({
      where: { key: COVER_KEY },
    });

    if (!setting) {
      return NextResponse.json({ error: 'Aucune couverture trouvée' }, { status: 404 });
    }

    const data = JSON.parse(setting.value);
    data.enabled = enabled;

    await db.systemSettings.update({
      where: { key: COVER_KEY },
      data: { value: JSON.stringify(data) },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('[PATCH /api/settings/cover] Error:', error);
    return NextResponse.json(
      { error: 'Erreur de mise à jour' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer la photo de couverture
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = await verifyToken(token);

    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const setting = await db.systemSettings.findUnique({
      where: { key: COVER_KEY },
    });

    if (!setting) {
      return NextResponse.json({ error: 'Aucune couverture trouvée' }, { status: 404 });
    }

    // Delete file
    try {
      const data = JSON.parse(setting.value);
      if (data.coverImage) {
        const filepath = path.join(UPLOAD_DIR, path.basename(data.coverImage));
        await unlink(filepath);
      }
    } catch (err) {
      console.error('[DELETE /api/settings/cover] Error deleting file:', err);
    }

    // Delete from database
    await db.systemSettings.delete({
      where: { key: COVER_KEY },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/settings/cover] Error:', error);
    return NextResponse.json(
      { error: 'Erreur de suppression' },
      { status: 500 }
    );
  }
}
