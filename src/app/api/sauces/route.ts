// ========================================
// API SAUCES - Liste & Création
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/bm/lib/auth'

// GET /api/sauces - Liste toutes les sauces
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const availableOnly = searchParams.get('available') === 'true'

    const sauces = await db.sauce.findMany({
      where: availableOnly ? { isAvailable: true } : undefined,
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json(sauces)
  } catch (error) {
    console.error('[GET /api/sauces] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sauces' },
      { status: 500 }
    )
  }
}

// POST /api/sauces - Créer une sauce
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireRole(req, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    const body = await req.json()
    const { name, nameAr, isAvailable, sortOrder } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Trouver le dernier sortOrder si non fourni
    let order = sortOrder
    if (order === undefined) {
      const lastSauce = await db.sauce.findFirst({
        orderBy: { sortOrder: 'desc' },
      })
      order = (lastSauce?.sortOrder || 0) + 1
    }

    const sauce = await db.sauce.create({
      data: {
        name,
        nameAr,
        isAvailable: isAvailable !== undefined ? isAvailable : true,
        sortOrder: order,
      },
    })

    console.log('[POST /api/sauces] Created:', sauce.name)
    return NextResponse.json(sauce, { status: 201 })
  } catch (error) {
    console.error('[POST /api/sauces] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create sauce' },
      { status: 500 }
    )
  }
}
