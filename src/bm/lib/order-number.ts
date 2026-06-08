// ========================================
// AWID / BURGER MINUTE - Order Number Generator
// Format: BM-YYMMDD-XXX (daily increment)
// ========================================

import { db } from '@/lib/db'

function getDateString(): string {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yy}${mm}${dd}`
}

export async function generateOrderNumber(): Promise<string> {
  const todayStr = getDateString()
  const prefix = `BM-${todayStr}`

  // Retry loop pour gérer les race conditions
  for (let attempt = 0; attempt < 5; attempt++) {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const lastOrder = await db.order.findFirst({
      where: {
        orderNumber: { startsWith: prefix },
        createdAt: { gte: todayStart },
      },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    })

    let maxSeq = 0
    if (lastOrder) {
      const match = lastOrder.orderNumber.match(/^BM-\d{6}-(\d+)$/)
      if (match) maxSeq = parseInt(match[1], 10)
    }

    const nextSeq = maxSeq + 1
    const orderNumber = `${prefix}-${String(nextSeq).padStart(3, '0')}`

    // Vérifier unicité avant de retourner
    const exists = await db.order.findUnique({
      where: { orderNumber },
      select: { id: true },
    })

    if (!exists) return orderNumber
    // Si existe, retry avec tentative suivante
  }

  // Fallback : timestamp-based suffix
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`
}
