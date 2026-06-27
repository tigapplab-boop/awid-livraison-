// ========================================
// AWID / BURGER MINUTE - Order Number Generator
// Format: 00001, 00002, 00003... (increment global)
// ========================================

import { db } from '@/lib/db'

export async function generateOrderNumber(): Promise<string> {
  // Retry loop pour gérer les race conditions
  for (let attempt = 0; attempt < 5; attempt++) {
    // Récupérer la dernière commande (tous types confondus)
    const lastOrder = await db.order.findFirst({
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    })

    let nextNumber = 1
    if (lastOrder) {
      // Extraire le numéro (format: 00001, 00002, etc.)
      const currentNumber = parseInt(lastOrder.orderNumber, 10)
      if (!isNaN(currentNumber)) {
        nextNumber = currentNumber + 1
      }
    }

    const orderNumber = String(nextNumber).padStart(5, '0')

    // Vérifier unicité avant de retourner
    const exists = await db.order.findUnique({
      where: { orderNumber },
      select: { id: true },
    })

    if (!exists) return orderNumber
    // Si existe, retry avec tentative suivante
  }

  // Fallback : timestamp-based suffix
  return `${Date.now().toString().slice(-5)}`
}
