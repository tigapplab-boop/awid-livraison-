// ========================================
// AWID / BURGER MINUTE - Clients Me API Route
// GET /api/clients/me - Get current client's orders via ClientToken
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Récupérer le token client depuis le cookie
    const clientToken = request.cookies.get('bm_client_token')?.value

    if (!clientToken) {
      return NextResponse.json(
        { error: 'Client token required' },
        { status: 401 }
      )
    }

    // Vérifier que le token existe et récupérer le client
    const token = await db.clientToken.findUnique({
      where: { token: clientToken },
      include: {
        client: {
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
                    sauces: {
                      include: {
                        sauce: true,
                      },
                    },
                  },
                },
                assignedLivreur: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!token || !token.client) {
      return NextResponse.json(
        { error: 'Invalid client token' },
        { status: 401 }
      )
    }

    // Mettre à jour lastUsed
    await db.clientToken.update({
      where: { id: token.id },
      data: { lastUsed: new Date() },
    })

    return NextResponse.json(token.client)
  } catch (error) {
    console.error('[Clients/Me] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
