// ========================================
// AWID / BURGER MINUTE - Zones API Route
// GET /api/zones - All delivery zones (active and inactive for admin)
// POST /api/zones - Create zone (ADMIN)
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/bm/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Check if auth header present - if so, return all zones including inactive
    const authHeader = request.headers.get('authorization')
    let showAll = false
    if (authHeader) {
      const { verifyToken, extractBearerToken } = await import('@/bm/lib/auth')
      const token = extractBearerToken(authHeader)
      if (token) {
        const payload = await verifyToken(token)
        if (payload && payload.role === 'ADMIN') {
          showAll = true
        }
      }
    }

    const zones = await db.deliveryZone.findMany({
      where: showAll ? {} : { isActive: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(zones)
  } catch (error) {
    console.error('[Zones] Fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole(request, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    const body = await request.json()
    const { name, dayFee, nightFee, startNight, endNight, isActive } = body

    if (!name || dayFee === undefined || nightFee === undefined) {
      return NextResponse.json(
        { error: 'Name, dayFee, and nightFee are required' },
        { status: 400 }
      )
    }

    const zone = await db.deliveryZone.create({
      data: {
        name,
        dayFee,
        nightFee,
        startNight: startNight || '19:00',
        endNight: endNight || '23:59',
        isActive: isActive !== undefined ? isActive : true,
      },
    })

    return NextResponse.json(zone, { status: 201 })
  } catch (error) {
    console.error('[Zones/POST] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
