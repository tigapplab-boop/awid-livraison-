// ========================================
// AWID / BURGER MINUTE - Promo Settings API
// GET/PUT /api/settings/promo - Manage main promo banner
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, type JwtPayload } from '@/bm/lib/auth'

const PROMO_KEY = 'MAIN_PROMO_BANNER'

// GET - Récupérer la config de la bannière promo
export async function GET(request: NextRequest) {
  try {
    const setting = await db.systemSettings.findUnique({
      where: { key: PROMO_KEY },
    })

    if (!setting) {
      // Return default if not found
      return NextResponse.json({
        enabled: false,
        text: '🔥 Offre spéciale du jour !',
        textAr: '🔥 عرض خاص اليوم!',
        bgColor: '#FF6B00',
      })
    }

    const config = JSON.parse(setting.value)
    return NextResponse.json(config)
  } catch (error) {
    console.error('[Settings/Promo] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour la bannière promo (ADMIN only)
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireRole(request, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    const body = await request.json()
    const { enabled, text, textAr, bgColor } = body

    // Validation
    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled must be a boolean' },
        { status: 400 }
      )
    }

    const config = {
      enabled,
      text: text || '🔥 Offre spéciale du jour !',
      textAr: textAr || '🔥 عرض خاص اليوم!',
      bgColor: bgColor || '#FF6B00',
    }

    // Upsert setting
    await db.systemSettings.upsert({
      where: { key: PROMO_KEY },
      create: {
        key: PROMO_KEY,
        value: JSON.stringify(config),
      },
      update: {
        value: JSON.stringify(config),
      },
    })

    return NextResponse.json(config)
  } catch (error) {
    console.error('[Settings/Promo] PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
