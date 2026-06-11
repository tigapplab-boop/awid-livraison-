// ========================================
// API SAUCES - Modifier & Supprimer
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/sauces/[id] - Modifier une sauce
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await req.json()
    const { name, nameAr, isAvailable, sortOrder } = body

    const sauce = await db.sauce.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(nameAr !== undefined && { nameAr }),
        ...(isAvailable !== undefined && { isAvailable }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    })

    console.log('[PATCH /api/sauces/:id] Updated:', sauce.name)
    return NextResponse.json(sauce)
  } catch (error) {
    console.error('[PATCH /api/sauces/:id] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update sauce' },
      { status: 500 }
    )
  }
}

// DELETE /api/sauces/[id] - Supprimer une sauce
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    await db.sauce.delete({
      where: { id },
    })

    console.log('[DELETE /api/sauces/:id] Deleted:', id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/sauces/:id] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete sauce' },
      { status: 500 }
    )
  }
}
