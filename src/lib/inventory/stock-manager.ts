// ========================================
// GESTION AUTOMATIQUE DU STOCK
// ========================================

import { db } from '@/lib/db'

export interface StockDecrementResult {
  success: boolean
  productId: string
  productName: string
  previousStock: number
  newStock: number
  quantity: number
  alertTriggered: boolean
}

/**
 * Décrémente automatiquement le stock des boissons d'une commande
 * Appelé quand une commande passe à CONFIRMED
 */
export async function decrementBeverageStock(
  orderId: string
): Promise<StockDecrementResult[]> {
  const results: StockDecrementResult[] = []

  // Récupérer la commande avec ses items
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  })

  if (!order) {
    throw new Error(`Order ${orderId} not found`)
  }

  // Pour chaque item de la commande
  for (const item of order.items) {
    // Vérifier si le produit a la gestion de stock activée
    if (!item.product.trackStock) {
      continue // Skip les produits sans gestion de stock
    }

    const previousStock = item.product.stockQuantity || 0
    const newStock = Math.max(0, previousStock - item.quantity)

    // Mettre à jour le stock
    await db.product.update({
      where: { id: item.product.id },
      data: {
        stockQuantity: newStock,
      },
    })

    // Vérifier si alerte stock bas
    const minAlert = item.product.minStockAlert || 10
    const alertTriggered = newStock <= minAlert && previousStock > minAlert

    results.push({
      success: true,
      productId: item.product.id,
      productName: item.product.name,
      previousStock,
      newStock,
      quantity: item.quantity,
      alertTriggered,
    })
  }

  return results
}

/**
 * Incrémente le stock d'un produit menu quand un achat inventaire est effectué
 */
export async function incrementProductStock(
  linkedProductId: string,
  quantity: number
): Promise<void> {
  await db.product.update({
    where: { id: linkedProductId },
    data: {
      stockQuantity: {
        increment: quantity,
      },
    },
  })
}

/**
 * Récupère tous les produits avec stock bas
 */
export async function getLowStockProducts() {
  const products = await db.product.findMany({
    where: {
      trackStock: true,
      isAvailable: true,
    },
    include: {
      category: true,
    },
  })

  return products.filter((p) => {
    const stock = p.stockQuantity || 0
    const minAlert = p.minStockAlert || 10
    return stock <= minAlert
  })
}

/**
 * Récupère les produits en rupture de stock
 */
export async function getOutOfStockProducts() {
  return await db.product.findMany({
    where: {
      trackStock: true,
      stockQuantity: { lte: 0 },
    },
    include: {
      category: true,
    },
  })
}

/**
 * Ajuste manuellement le stock d'un produit
 * (pour corrections, inventaire physique, etc.)
 */
export async function adjustProductStock(
  productId: string,
  newStock: number,
  reason?: string
): Promise<void> {
  await db.product.update({
    where: { id: productId },
    data: {
      stockQuantity: Math.max(0, newStock),
    },
  })

  // TODO: Logger l'ajustement pour traçabilité
  console.log(`[Stock Adjustment] Product ${productId}: new stock = ${newStock}. Reason: ${reason}`)
}
