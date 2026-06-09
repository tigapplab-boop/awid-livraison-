// ========================================
// AWID / BURGER MINUTE - Product Promo API
// PATCH /api/products/[id]/promo - Update product promo banner
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/bm/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireRole(request, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    const { id } = params
    const body = await request.json()
    const { hasPromo, promoText, promoTextAr, promoBgColor } = body

    // Validation
    if (typeof hasPromo !== 'boolean') {
      return NextResponse.json(
        { error: 'hasPromo must be a boolean' },
        { status: 400 }
      )
    }

    // Update product
    const product = await db.product.update({
      where: { id },
      data: {
        hasPromo,
        promoText: hasPromo ? promoText || null : null,
        promoTextAr: hasPromo ? promoTextAr || null : null,
        promoBgColor: hasPromo ? promoBgColor || '#FF6B00' : null,
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
    console.error('[Products/Promo] PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
