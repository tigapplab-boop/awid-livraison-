import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/bm/lib/auth'

// GET - Public
export async function GET() {
  try {
    const setting = await db.systemSettings.findUnique({
      where: { key: 'RESTAURANT_INFO' },
    })

    const defaultInfo = {
      phone: '+213 26 XX XX XX',
      address: 'Grande Plage, Tigzirt, Algérie',
      lat: 36.894516,
      lng: 4.125496,
      mapsUrl: 'https://maps.app.goo.gl/yvB4pWXzKzQadb9x7',
      gallery: [],
    }

    if (!setting) {
      return NextResponse.json(defaultInfo)
    }

    return NextResponse.json(JSON.parse(setting.value))
  } catch (error) {
    console.error('[Restaurant Info] GET error:', error)
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
    const { phone, address, lat, lng, mapsUrl, gallery } = body

    await db.systemSettings.upsert({
      where: { key: 'RESTAURANT_INFO' },
      update: {
        value: JSON.stringify({ phone, address, lat, lng, mapsUrl, gallery: gallery || [] }),
        updatedAt: new Date(),
      },
      create: {
        key: 'RESTAURANT_INFO',
        value: JSON.stringify({ phone, address, lat, lng, mapsUrl, gallery: gallery || [] }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    console.error('[Restaurant Info] PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
