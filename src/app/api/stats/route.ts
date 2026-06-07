// ========================================
// AWID / BURGER MINUTE - Stats API Route
// GET /api/stats - Dashboard statistics (ADMIN only)
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/bm/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Require ADMIN role
    const authResult = await requireRole(request, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    const now = new Date()

    // Today bounds
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(now)
    todayEnd.setHours(23, 59, 59, 999)

    // This week start (Monday)
    const weekStart = new Date(now)
    const day = weekStart.getDay()
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1) // Monday
    weekStart.setDate(diff)
    weekStart.setHours(0, 0, 0, 0)

    // This month start
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Orders today
    const todayOrders = await db.order.findMany({
      where: {
        createdAt: { gte: todayStart, lte: todayEnd },
      },
      select: {
        total: true,
        deliveryFee: true,
        source: true,
        status: true,
        paymentStatus: true,
      },
    })

    // Orders this week
    const weekOrders = await db.order.findMany({
      where: {
        createdAt: { gte: weekStart },
      },
      select: { total: true },
    })

    // Orders this month
    const monthOrders = await db.order.findMany({
      where: {
        createdAt: { gte: monthStart },
      },
      select: { total: true, deliveryFee: true },
    })

    // Calculate stats
    const totalOrdersToday = todayOrders.length
    const totalRevenueToday = todayOrders.reduce((sum, o) => sum + o.total, 0)
    const totalDeliveryFeesToday = todayOrders.reduce((sum, o) => sum + o.deliveryFee, 0)

    const totalOrdersWeek = weekOrders.length
    const totalRevenueWeek = weekOrders.reduce((sum, o) => sum + o.total, 0)

    const totalOrdersMonth = monthOrders.length
    const totalRevenueMonth = monthOrders.reduce((sum, o) => sum + o.total, 0)
    const totalDeliveryFeesMonth = monthOrders.reduce((sum, o) => sum + o.deliveryFee, 0)

    // Orders by source
    const onlineOrdersToday = todayOrders.filter((o) => o.source === 'ONLINE').length
    const phoneOrdersToday = todayOrders.filter((o) => o.source === 'PHONE_CALL').length
    const posOrdersToday = todayOrders.filter((o) => o.source === 'POS').length

    // Recent orders (last 24h)
    const recentStart = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const recentOrdersCount = await db.order.count({
      where: {
        createdAt: { gte: recentStart },
      },
    })

    return NextResponse.json({
      today: {
        totalOrders: totalOrdersToday,
        totalRevenue: totalRevenueToday,
        totalDeliveryFees: totalDeliveryFeesToday,
        onlineOrders: onlineOrdersToday,
        phoneOrders: phoneOrdersToday,
        posOrders: posOrdersToday,
      },
      week: {
        totalOrders: totalOrdersWeek,
        totalRevenue: totalRevenueWeek,
      },
      month: {
        totalOrders: totalOrdersMonth,
        totalRevenue: totalRevenueMonth,
        totalDeliveryFees: totalDeliveryFeesMonth,
      },
      recent: {
        last24h: recentOrdersCount,
      },
    })
  } catch (error) {
    console.error('[Stats] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
