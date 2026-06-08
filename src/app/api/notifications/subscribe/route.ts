// ========================================
// AWID / BURGER MINUTE - Push Subscription API
// POST: Register or update a push subscription
// DELETE: Remove a push subscription
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit } from '@/bm/lib/rate-limit'

interface SubscribeBody {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  userId?: string
}

interface UnsubscribeBody {
  endpoint: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown'
    const rateResult = rateLimit(clientIp, { maxRequests: 10, windowMs: 60_000, key: 'push-subscribe' })
    if (!rateResult.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(Math.ceil((rateResult.resetAt - Date.now()) / 1000)) } })
    }

    const body: SubscribeBody = await request.json()

    if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return NextResponse.json(
        { error: 'Missing required fields: endpoint, keys.p256dh, keys.auth' },
        { status: 400 }
      )
    }

    // Upsert: if a subscription with the same endpoint exists, update it
    const subscription = await db.pushSubscription.upsert({
      where: { endpoint: body.endpoint },
      update: {
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        userId: body.userId ?? null,
      },
      create: {
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        userId: body.userId ?? null,
      },
    })

    return NextResponse.json({ success: true, id: subscription.id })
  } catch (error) {
    console.error('[Push Subscribe] Error saving subscription:', error)
    return NextResponse.json(
      { error: 'Failed to save push subscription' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const body: UnsubscribeBody = await request.json()

    if (!body.endpoint) {
      return NextResponse.json(
        { error: 'Missing required field: endpoint' },
        { status: 400 }
      )
    }

    await db.pushSubscription.deleteMany({
      where: { endpoint: body.endpoint },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Push Subscribe] Error removing subscription:', error)
    return NextResponse.json(
      { error: 'Failed to remove push subscription' },
      { status: 500 }
    )
  }
}
