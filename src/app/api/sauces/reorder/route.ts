// ========================================
// API SAUCES - Réorganisation
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/sauces/reorder - Réorganiser l'ordre des sauces
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { sauces } = body // Array de { id, sortOrder }

    if (!Array.isArray(sauces)) {
      return NextResponse.json(
        { error: 'sauces array is required' },
        { status: 400 }
      )
    }

    // Mettre à jour chaque sauce
    await Promise.all(
      sauces.map((sauce) =>
        db.sauce.update({
          where: { id: sauce.id },
          data: { sortOrder: sauce.sortOrder },
        })
      )
    )

    console.log('[PATCH /api/sauces/reorder] Reordered', sauces.length, 'sauces')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[PATCH /api/sauces/reorder] Error:', error)
    return NextResponse.json(
      { error: 'Failed to reorder sauces' },
      { status: 500 }
    )
  }
}
