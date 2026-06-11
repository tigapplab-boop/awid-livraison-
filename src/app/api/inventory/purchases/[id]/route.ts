// ========================================
// API INVENTAIRE - Achat Détail, Modification, Suppression
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { calculatePurchaseTotal } from '@/lib/inventory/calculations'

// GET /api/inventory/purchases/[id] - Détail d'un achat
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const purchase = await db.purchase.findUnique({
      where: { id },
      include: {
        product: true,
      },
    })

    if (!purchase) {
      return NextResponse.json(
        { error: 'Purchase not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(purchase)
  } catch (error) {
    console.error('[GET /api/inventory/purchases/:id] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch purchase' },
      { status: 500 }
    )
  }
}

// PATCH /api/inventory/purchases/[id] - Modifier un achat
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await req.json()

    // Récupérer l'achat actuel pour calculer le delta de stock
    const currentPurchase = await db.purchase.findUnique({
      where: { id },
      include: { product: { include: { linkedProduct: true } } },
    })

    if (!currentPurchase) {
      return NextResponse.json(
        { error: 'Purchase not found' },
        { status: 404 }
      )
    }

    // Si la quantité change, ajuster le stock
    if (body.quantity !== undefined && body.quantity !== currentPurchase.quantity) {
      const delta = body.quantity - currentPurchase.quantity

      // Ajuster stock inventaire
      await db.inventoryProduct.update({
        where: { id: currentPurchase.productId },
        data: {
          currentStock: {
            increment: delta,
          },
        },
      })

      // Ajuster stock produit menu si lié
      if (currentPurchase.product.linkedProduct?.trackStock) {
        await db.product.update({
          where: { id: currentPurchase.product.linkedProductId! },
          data: {
            stockQuantity: {
              increment: delta,
            },
          },
        })
      }
    }

    // Recalculer le total si nécessaire
    const newQuantity = body.quantity !== undefined ? body.quantity : currentPurchase.quantity
    const newUnitPrice = body.unitPrice !== undefined ? body.unitPrice : currentPurchase.unitPrice
    const totalAmount = calculatePurchaseTotal(newQuantity, newUnitPrice)

    const purchase = await db.purchase.update({
      where: { id },
      data: {
        ...(body.quantity !== undefined && { quantity: body.quantity }),
        ...(body.unitPrice !== undefined && { unitPrice: body.unitPrice }),
        totalAmount,
        ...(body.supplier !== undefined && { supplier: body.supplier }),
        ...(body.isPaid !== undefined && { isPaid: body.isPaid }),
        ...(body.paidAt !== undefined && { paidAt: body.paidAt ? new Date(body.paidAt) : null }),
        ...(body.paymentMethod !== undefined && { paymentMethod: body.paymentMethod }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.invoiceNumber !== undefined && { invoiceNumber: body.invoiceNumber }),
      },
    })

    console.log('[PATCH /api/inventory/purchases/:id] Updated:', purchase.purchaseNumber)
    return NextResponse.json(purchase)
  } catch (error) {
    console.error('[PATCH /api/inventory/purchases/:id] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update purchase' },
      { status: 500 }
    )
  }
}

// DELETE /api/inventory/purchases/[id] - Supprimer un achat
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Récupérer l'achat pour ajuster le stock
    const purchase = await db.purchase.findUnique({
      where: { id },
      include: { product: { include: { linkedProduct: true } } },
    })

    if (!purchase) {
      return NextResponse.json(
        { error: 'Purchase not found' },
        { status: 404 }
      )
    }

    // Décrémenter le stock (on retire l'achat)
    await db.inventoryProduct.update({
      where: { id: purchase.productId },
      data: {
        currentStock: {
          decrement: purchase.quantity,
        },
      },
    })

    // Décrémenter stock produit menu si lié
    if (purchase.product.linkedProduct?.trackStock) {
      await db.product.update({
        where: { id: purchase.product.linkedProductId! },
        data: {
          stockQuantity: {
            decrement: purchase.quantity,
          },
        },
      })
    }

    // Supprimer l'achat
    await db.purchase.delete({
      where: { id },
    })

    console.log('[DELETE /api/inventory/purchases/:id] Deleted:', purchase.purchaseNumber)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/inventory/purchases/:id] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete purchase' },
      { status: 500 }
    )
  }
}
