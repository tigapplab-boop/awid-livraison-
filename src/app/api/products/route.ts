// ========================================
// AWID / BURGER MINUTE - Products API Route
// GET /api/products - All categories with products
// POST /api/products - Create product (ADMIN)
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/bm/lib/auth'
import { rateLimit } from '@/bm/lib/rate-limit'

export async function GET(request: NextRequest) {
  try {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown'
    const rateResult = rateLimit(clientIp, { maxRequests: 120, windowMs: 60_000, key: 'products-get' })
    if (!rateResult.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(Math.ceil((rateResult.resetAt - Date.now()) / 1000)) } })
    }
    const categories = await db.category.findMany({
      where: { isActive: true },
      include: {
        products: {
          where: { isAvailable: true },
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
    console.error('[Products] Fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole(request, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    const body = await request.json()
    const { name, nameAr, description, price, image, isAvailable, categoryId } = body

    if (!name || !price || !categoryId) {
      return NextResponse.json(
        { error: 'Name, price, and categoryId are required' },
        { status: 400 }
      )
    }

    const category = await db.category.findUnique({ where: { id: categoryId } })
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 400 })
    }

    const product = await db.product.create({
      data: {
        name,
        nameAr: nameAr || null,
        description: description || null,
        price,
        image: image || null,
        isAvailable: isAvailable !== undefined ? isAvailable : true,
        categoryId,
      },
      include: { category: true },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('[Products/POST] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
