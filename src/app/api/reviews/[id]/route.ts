// ========================================
// AWID / BURGER MINUTE - Review [id] API Route
// PATCH /api/reviews/[id] - Publish/unpublish review (admin only)
// DELETE /api/reviews/[id] - Delete review (admin only)
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/bm/lib/auth'

// PATCH - Publish/unpublish review
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(request, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    const { id } = await params
    const body = await request.json()
    const { isPublished } = body

    const review = await db.review.update({
      where: { id },
      data: { isPublished: !!isPublished },
    })

    return NextResponse.json(review)
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    console.error('[Reviews/ID] PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete review
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(request, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    const { id } = await params

    await db.review.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    console.error('[Reviews/ID] DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
