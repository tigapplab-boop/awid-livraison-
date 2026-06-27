import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/bm/lib/auth'

// GET - Public
export async function GET() {
  try {
    const setting = await db.systemSettings.findUnique({
      where: { key: 'MAINTENANCE_MODE' },
    })

    if (!setting) {
      return NextResponse.json({ enabled: false, message: '' })
    }

    return NextResponse.json(JSON.parse(setting.value))
  } catch (error) {
    console.error('[Maintenance] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Admin only
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireRole(request, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    const body = await request.json()
    const { enabled, message } = body

    await db.systemSettings.upsert({
      where: { key: 'MAINTENANCE_MODE' },
      update: {
        value: JSON.stringify({ enabled: !!enabled, message: message || '' }),
        updatedAt: new Date(),
      },
      create: {
        key: 'MAINTENANCE_MODE',
        value: JSON.stringify({ enabled: !!enabled, message: message || '' }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    console.error('[Maintenance] PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
