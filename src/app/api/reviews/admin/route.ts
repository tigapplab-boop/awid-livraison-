// ========================================
// AWID / BURGER MINUTE - Reviews Admin API Route
// GET /api/reviews/admin - Get all reviews (admin only)
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/bm/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole(request, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    const { searchParams } = request.nextUrl
    const status = searchParams.get('status') // published | pending | all

    const where: any = {}
    if (status === 'published') where.isPublished = true
    if (status === 'pending') where.isPublished = false

    const reviews = await db.review.findMany({
      where,
      include: {
        client: {
          select: {
            name: true,
            phone: true,
          },
        },
        order: {
          select: {
            orderNumber: true,
            status: true,
          },
        },
        product: {
          select: {
            name: true,
            nameAr: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(reviews)
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    console.error('[Reviews/Admin] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
