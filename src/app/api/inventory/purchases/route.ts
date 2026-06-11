// ========================================
// API INVENTAIRE - Achats Liste & Création
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generatePurchaseNumber, calculatePurchaseTotal } from '@/lib/inventory/calculations'

// GET /api/inventory/purchases - Liste tous les achats
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const isPaid = searchParams.get('isPaid')
    const supplier = searchParams.get('supplier')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const purchases = await db.purchase.findMany({
      where: {
        ...(isPaid !== null && isPaid !== undefined && {
          isPaid: isPaid === 'true',
        }),
        ...(supplier && { supplier }),
        ...(startDate && {
          purchaseDate: {
            gte: new Date(startDate),
          },
        }),
        ...(endDate && {
          purchaseDate: {
            lte: new Date(endDate),
          },
        }),
      },
      include: {
        product: true,
      },
      orderBy: { purchaseDate: 'desc' },
    })

    return NextResponse.json(purchases)
  } catch (error) {
    console.error('[GET /api/inventory/purchases] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch purchases' },
      { status: 500 }
    )
  }
}

// POST /api/inventory/purchases - Créer un achat
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      productId,
      quantity,
      unitPrice,
      supplier,
      isPaid,
      paidAt,
      paymentMethod,
      notes,
      invoiceNumber,
      purchaseDate,
    } = body

    // Validation
    if (!productId || !quantity || unitPrice === undefined || !supplier) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Vérifier que le produit existe
    const product = await db.inventoryProduct.findUnique({
      where: { id: productId },
      include: { linkedProduct: true },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Calculer le total
    const totalAmount = calculatePurchaseTotal(quantity, unitPrice)

    // Générer le numéro d'achat
    const purchaseNumber = generatePurchaseNumber(
      purchaseDate ? new Date(purchaseDate) : new Date()
    )

    // Créer l'achat
    const purchase = await db.purchase.create({
      data: {
        purchaseNumber,
        productId,
        quantity,
        unitPrice,
        totalAmount,
        supplier,
        isPaid: isPaid || false,
        paidAt: isPaid && paidAt ? new Date(paidAt) : null,
        paymentMethod: isPaid ? paymentMethod : null,
        notes,
        invoiceNumber,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      },
    })

    // Incrémenter le stock du produit d'inventaire
    await db.inventoryProduct.update({
      where: { id: productId },
      data: {
        currentStock: {
          increment: quantity,
        },
      },
    })

    // Si le produit est lié à un produit menu, incrémenter aussi son stock
    if (product.linkedProduct && product.linkedProduct.trackStock) {
      await db.product.update({
        where: { id: product.linkedProductId! },
        data: {
          stockQuantity: {
            increment: quantity,
          },
        },
      })
    }

    console.log('[POST /api/inventory/purchases] Created:', purchase.purchaseNumber)
    return NextResponse.json(purchase, { status: 201 })
  } catch (error) {
    console.error('[POST /api/inventory/purchases] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create purchase' },
      { status: 500 }
    )
  }
}
