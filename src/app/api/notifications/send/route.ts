// ========================================
// AWID / BURGER MINUTE - Send Push Notification API
// POST: Send a push notification to a specific user
// Requires ADMIN or LIVREUR authentication
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/bm/lib/auth'
import { sendPushToUser } from '@/bm/lib/push-send'

interface SendNotificationBody {
  userId: string
  title: string
  body: string
  data?: Record<string, unknown>
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Authenticate: require ADMIN or LIVREUR role
  const authResult = await authenticateRequest(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const user = authResult as { role: string }

  // Only ADMIN or LIVREUR can send notifications
  if (user.role !== 'ADMIN' && user.role !== 'LIVREUR') {
    return NextResponse.json(
      { error: 'Insufficient permissions. ADMIN or LIVREUR role required.' },
      { status: 403 }
    )
  }

  try {
    const body: SendNotificationBody = await request.json()

    if (!body.userId || !body.title || !body.body) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, title, body' },
        { status: 400 }
      )
    }

    const result = await sendPushToUser(body.userId, {
      title: body.title,
      body: body.body,
      data: body.data,
    })

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
    })
  } catch (error) {
    console.error('[Push Send] Error sending notification:', error)
    return NextResponse.json(
      { error: 'Failed to send push notification' },
      { status: 500 }
    )
  }
}
