// ========================================
// AWID / BURGER MINUTE - Clients [phone] API Route
// GET /api/clients/[phone] - ADMIN ONLY - Get client by phone
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/bm/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    // SÉCURITÉ: Réservé aux admins uniquement
    const authResult = await requireRole(request, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    const { phone } = await params

    const client = await db.client.findUnique({
      where: { phone },
      include: {
        addresses: {
          orderBy: { isDefault: 'desc' },
        },
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    nameAr: true,
                    price: true,
                    image: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(client)
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    console.error('[Clients/Phone] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
