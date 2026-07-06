// ========================================
// API INVENTAIRE - Produit Détail, Modification, Suppression
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/inventory/products/[id] - Détail d'un produit
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const product = await db.inventoryProduct.findUnique({
      where: { id },
      include: {
        linkedProduct: {
          include: {
            category: true,
          },
        },
        purchases: {
          orderBy: { purchaseDate: 'desc' },
        },
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('[GET /api/inventory/products/:id] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

// PATCH /api/inventory/products/[id] - Modifier un produit
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await req.json()

    const product = await db.inventoryProduct.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.nameAr !== undefined && { nameAr: body.nameAr }),
        ...(body.supplier !== undefined && { supplier: body.supplier }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.unit !== undefined && { unit: body.unit }),
        ...(body.purchasePrice !== undefined && { purchasePrice: body.purchasePrice }),
        ...(body.sellingPrice !== undefined && { sellingPrice: body.sellingPrice }),
        ...(body.currentStock !== undefined && { currentStock: body.currentStock }),
        ...(body.minStock !== undefined && { minStock: body.minStock }),
        ...(body.linkedProductId !== undefined && { linkedProductId: body.linkedProductId }),
      },
    })

    console.log('[PATCH /api/inventory/products/:id] Updated:', product.name)
    return NextResponse.json(product)
  } catch (error) {
    console.error('[PATCH /api/inventory/products/:id] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

// DELETE /api/inventory/products/[id] - Supprimer un produit
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const force = req.nextUrl.searchParams.get('force') === 'true'

    // Vérifier qu'il n'y a pas d'achats liés (sauf si force=true)
    if (!force) {
      const purchasesCount = await db.purchase.count({
        where: { productId: id },
      })

      if (purchasesCount > 0) {
        return NextResponse.json(
          { error: 'Cannot delete product with existing purchases' },
          { status: 400 }
        )
      }
    } else {
      // Force : supprimer d'abord tous les achats liés
      await db.purchase.deleteMany({ where: { productId: id } })
    }

    await db.inventoryProduct.delete({
      where: { id },
    })

    console.log('[DELETE /api/inventory/products/:id] Deleted:', id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/inventory/products/:id] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}
