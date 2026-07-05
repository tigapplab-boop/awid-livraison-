// ========================================
// API INVENTAIRE - Produits Liste & Création
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/bm/lib/auth'

// GET /api/inventory/products - Liste tous les produits d'inventaire
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireRole(req, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const supplier = searchParams.get('supplier')

    const products = await db.inventoryProduct.findMany({
      where: {
        ...(category && { category }),
        ...(supplier && { supplier }),
      },
      include: {
        linkedProduct: {
          include: {
            category: true,
          },
        },
        purchases: {
          orderBy: { purchaseDate: 'desc' },
          take: 5,
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error('[GET /api/inventory/products] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory products' },
      { status: 500 }
    )
  }
}

// POST /api/inventory/products - Créer un produit d'inventaire
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireRole(req, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    const body = await req.json()
    const {
      name,
      nameAr,
      supplier,
      category,
      unit,
      purchasePrice,
      sellingPrice,
      currentStock,
      minStock,
      linkedProductId,
    } = body

    // Validation
    if (!name || !supplier || !category || !unit) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (purchasePrice === undefined || sellingPrice === undefined) {
      return NextResponse.json(
        { error: 'Prices are required' },
        { status: 400 }
      )
    }

    const product = await db.inventoryProduct.create({
      data: {
        name,
        nameAr,
        supplier,
        category,
        unit,
        purchasePrice,
        sellingPrice,
        currentStock: currentStock || 0,
        minStock: minStock || 0,
        linkedProductId: linkedProductId || null,
      },
    })

    console.log('[POST /api/inventory/products] Created:', product.name)
    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('[POST /api/inventory/products] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create inventory product' },
      { status: 500 }
    )
  }
}
