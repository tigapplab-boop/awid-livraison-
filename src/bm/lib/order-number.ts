// ========================================
// AWID / BURGER MINUTE - Order Number Generator
// Format: BM-YYMMDD-XXX (daily increment)
// ========================================

import { db } from '@/lib/db'

// In-memory cache for daily counter
let lastDate: string = ''
let dailyCounter: number = 0

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

  // Reset counter if day changed
  if (todayStr !== lastDate) {
    lastDate = todayStr
    dailyCounter = 0
  }

  // Find the highest existing number for today
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const todayOrders = await db.order.findMany({
    where: {
      createdAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
    select: { orderNumber: true },
    orderBy: { orderNumber: 'desc' },
  })

  let maxSeq = 0
  for (const order of todayOrders) {
    const match = order.orderNumber.match(/^BM-\d{6}-(\d+)$/)
    if (match) {
      const seq = parseInt(match[1], 10)
      if (seq > maxSeq) maxSeq = seq
    }
  }

  // Also check in-memory counter
  const nextSeq = Math.max(maxSeq, dailyCounter) + 1
  dailyCounter = nextSeq

  const orderNumber = `${prefix}-${String(nextSeq).padStart(3, '0')}`
  return orderNumber
}
