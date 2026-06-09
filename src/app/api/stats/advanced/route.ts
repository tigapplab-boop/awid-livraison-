// ========================================
// AWID / BURGER MINUTE - Advanced Stats API
// GET /api/stats/advanced - Get filtered statistics
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/bm/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole(request, 'ADMIN')
    if (authResult instanceof NextResponse) return authResult

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const livreurId = searchParams.get('livreurId')
    const productId = searchParams.get('productId')

    // Build filter
    const where: any = {
      status: { in: ['DELIVERED', 'CANCELLED'] },
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z'),
      }
    } else if (startDate) {
      where.createdAt = { gte: new Date(startDate) }
    } else if (endDate) {
      where.createdAt = { lte: new Date(endDate + 'T23:59:59.999Z') }
    }

    if (livreurId) {
      where.assignedLivreurId = livreurId
    }

    // Fetch orders
    const orders = await db.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                nameAr: true,
                price: true,
              },
            },
          },
        },
        assignedLivreur: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Calculate stats
    const totalOrders = orders.length
    const deliveredOrders = orders.filter(o => o.status === 'DELIVERED').length
    const cancelledOrders = orders.filter(o => o.status === 'CANCELLED').length
    const totalRevenue = orders
      .filter(o => o.status === 'DELIVERED')
      .reduce((sum, o) => sum + o.total, 0)
    const totalDeliveryFees = orders
      .filter(o => o.status === 'DELIVERED')
      .reduce((sum, o) => sum + o.deliveryFee, 0)

    // Stats by source
    const onlineOrders = orders.filter(o => o.source === 'ONLINE').length
    const phoneOrders = orders.filter(o => o.source === 'PHONE_CALL').length
    const posOrders = orders.filter(o => o.source === 'POS').length

    // Stats by payment
    const paidOrders = orders.filter(o => o.paymentStatus === 'PAID').length
    const partialPayments = orders.filter(o => o.paymentStatus === 'PARTIAL').length
    const offeredOrders = orders.filter(o => o.paymentStatus === 'OFFERED').length

    // Product stats (if filtering by product)
    let productStats: any = null
    if (productId) {
      const productOrders = orders.filter(o =>
        o.items.some(item => item.productId === productId)
      )
      const productItems = productOrders.flatMap(o =>
        o.items.filter(item => item.productId === productId)
      )
      const totalQuantity = productItems.reduce((sum, item) => sum + item.quantity, 0)
      const totalRevenue = productItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

      productStats = {
        totalOrders: productOrders.length,
        totalQuantity,
        totalRevenue,
        product: productItems[0]?.product || null,
      }
    }

    // Livreur stats
    const livreurStats: any = {}
    orders
      .filter(o => o.assignedLivreur)
      .forEach(o => {
        const livId = o.assignedLivreurId!
        if (!livreurStats[livId]) {
          livreurStats[livId] = {
            livreur: o.assignedLivreur,
            totalOrders: 0,
            deliveredOrders: 0,
            cancelledOrders: 0,
            totalRevenue: 0,
            totalDeliveryFees: 0,
          }
        }
        livreurStats[livId].totalOrders++
        if (o.status === 'DELIVERED') {
          livreurStats[livId].deliveredOrders++
          livreurStats[livId].totalRevenue += o.total
          livreurStats[livId].totalDeliveryFees += o.deliveryFee
        } else if (o.status === 'CANCELLED') {
          livreurStats[livId].cancelledOrders++
        }
      })

    // Top products
    const productMap: any = {}
    orders
      .filter(o => o.status === 'DELIVERED')
      .forEach(o => {
        o.items.forEach(item => {
          const pid = item.productId
          if (!productMap[pid]) {
            productMap[pid] = {
              product: item.product,
              totalQuantity: 0,
              totalRevenue: 0,
              totalOrders: 0,
            }
          }
          productMap[pid].totalQuantity += item.quantity
          productMap[pid].totalRevenue += item.price * item.quantity
          productMap[pid].totalOrders++
        })
      })

    const topProducts = Object.values(productMap)
      .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10)

    return NextResponse.json({
      summary: {
        totalOrders,
        deliveredOrders,
        cancelledOrders,
        totalRevenue,
        totalDeliveryFees,
        onlineOrders,
        phoneOrders,
        posOrders,
        paidOrders,
        partialPayments,
        offeredOrders,
      },
      livreurStats: Object.values(livreurStats),
      topProducts,
      productStats,
      orders,
    })
  } catch (error) {
    console.error('[Stats/Advanced] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
