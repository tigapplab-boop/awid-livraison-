// ========================================
// AWID / BURGER MINUTE - Opening Hours API
// GET/PUT /api/settings/hours - Manage opening/closing hours
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/bm/lib/auth'

const HOURS_KEY = 'OPENING_HOURS'

export interface OpeningHours {
  enabled: boolean
  monday: { open: string; close: string; closed: boolean }
  tuesday: { open: string; close: string; closed: boolean }
  wednesday: { open: string; close: string; closed: boolean }
  thursday: { open: string; close: string; closed: boolean }
  friday: { open: string; close: string; closed: boolean }
  saturday: { open: string; close: string; closed: boolean }
  sunday: { open: string; close: string; closed: boolean }
}

const DEFAULT_HOURS: OpeningHours = {
  enabled: true,
  monday: { open: '09:00', close: '23:00', closed: false },
  tuesday: { open: '09:00', close: '23:00', closed: false },
  wednesday: { open: '09:00', close: '23:00', closed: false },
  thursday: { open: '09:00', close: '23:00', closed: false },
  friday: { open: '09:00', close: '23:00', closed: false },
  saturday: { open: '09:00', close: '23:00', closed: false },
  sunday: { open: '09:00', close: '23:00', closed: false },
}

// GET - Récupérer les horaires d'ouverture (PUBLIC)
export async function GET() {
  try {
    const setting = await db.systemSettings.findUnique({
      where: { key: HOURS_KEY },
    })

    if (!setting) {
      return NextResponse.json(DEFAULT_HOURS)
    }

    const hours = JSON.parse(setting.value)
    return NextResponse.json(hours)
  } catch (error) {
    console.error('[Settings/Hours] GET error:', error)
    return NextResponse.json(DEFAULT_HOURS, { status: 500 })
  }
}

// PUT - Mettre à jour les horaires (ADMIN only)
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireRole(request, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    const body = await request.json()
    const { enabled, monday, tuesday, wednesday, thursday, friday, saturday, sunday } = body

    // Validation
    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled must be a boolean' },
        { status: 400 }
      )
    }

    const hours: OpeningHours = {
      enabled,
      monday: monday || DEFAULT_HOURS.monday,
      tuesday: tuesday || DEFAULT_HOURS.tuesday,
      wednesday: wednesday || DEFAULT_HOURS.wednesday,
      thursday: thursday || DEFAULT_HOURS.thursday,
      friday: friday || DEFAULT_HOURS.friday,
      saturday: saturday || DEFAULT_HOURS.saturday,
      sunday: sunday || DEFAULT_HOURS.sunday,
    }

    // Upsert setting
    await db.systemSettings.upsert({
      where: { key: HOURS_KEY },
      create: {
        key: HOURS_KEY,
        value: JSON.stringify(hours),
      },
      update: {
        value: JSON.stringify(hours),
      },
    })

    return NextResponse.json(hours)
  } catch (error) {
    console.error('[Settings/Hours] PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
