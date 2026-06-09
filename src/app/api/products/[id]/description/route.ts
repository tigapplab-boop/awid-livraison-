// ========================================
// AWID / BURGER MINUTE - Product Description API
// PATCH /api/products/[id]/description - Update product description
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/bm/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(request, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    const { id } = await params
    const body = await request.json()
    const { description, descriptionAr } = body

    // Update product description
    const product = await db.product.update({
      where: { id },
      data: {
        description: description || null,
        descriptionAr: descriptionAr || null,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            nameAr: true,
          },
        },
      },
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('[Products/Description] PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
