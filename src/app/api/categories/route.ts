// ========================================
// AWID / BURGER MINUTE - Categories API Route
// GET /api/categories - All categories (with all products including unavailable)
// POST /api/categories - Create category (ADMIN)
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/bm/lib/auth'

export async function GET() {
  try {
    const categories = await db.category.findMany({
      include: {
        products: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            description: true,
            price: true,
            image: true,
            isAvailable: true,
            categoryId: true,
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('[Categories] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole(request, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    const body = await request.json()
    const { name, nameAr, sortOrder, isActive } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const category = await db.category.create({
      data: {
        name,
        nameAr: nameAr || null,
        sortOrder: sortOrder || 0,
        isActive: isActive !== undefined ? isActive : true,
      },
      include: { products: true },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('[Categories/POST] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
