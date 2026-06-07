// ========================================
// AWID / BURGER MINUTE - Calculate Fee API Route
// GET /api/zones/calculate-fee?zoneId=xxx
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isNightTime } from '@/bm/lib/format'

export async function GET(request: NextRequest) {
  try {
    const zoneId = request.nextUrl.searchParams.get('zoneId')

    if (!zoneId) {
      return NextResponse.json(
        { error: 'zoneId query parameter is required' },
        { status: 400 }
      )
    }

    const zone = await db.deliveryZone.findUnique({
      where: { id: zoneId },
    })

    if (!zone) {
      return NextResponse.json(
        { error: 'Zone not found' },
        { status: 404 }
      )
    }

    // Calculate if current time is night time
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`

    const isNight = isNightTime(currentTimeStr, zone.startNight, zone.endNight)
    const currentFee = isNight ? zone.nightFee : zone.dayFee

    return NextResponse.json({
      zoneId: zone.id,
      zoneName: zone.name,
      dayFee: zone.dayFee,
      nightFee: zone.nightFee,
      currentFee,
      isNight,
      startNight: zone.startNight,
      endNight: zone.endNight,
    })
  } catch (error) {
    console.error('[Zones/CalculateFee] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

