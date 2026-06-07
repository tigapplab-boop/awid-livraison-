// ========================================
// AWID / BURGER MINUTE - Category [id] API Route
// PATCH /api/categories/[id] - Update category (ADMIN)
// DELETE /api/categories/[id] - Delete category (ADMIN)
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

    const existing = await db.category.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.nameAr !== undefined) updateData.nameAr = body.nameAr
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    const category = await db.category.update({
      where: { id },
      data: updateData,
      include: { products: true },
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('[Categories/PATCH] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(request, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    const { id } = await params

    const existing = await db.category.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Delete all products in this category first (cascade)
    await db.product.deleteMany({ where: { categoryId: id } })

    // Then delete the category
    await db.category.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Category deleted' })
  } catch (error) {
    console.error('[Categories/DELETE] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
