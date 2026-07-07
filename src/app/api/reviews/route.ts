// ========================================
// AWID / BURGER MINUTE - Reviews API Route
// POST /api/reviews - Create review (client only, must have DELIVERED order)
// GET /api/reviews - Get published reviews (public)
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Public - Only published reviews
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const type = searchParams.get('type') // PRODUCT | SERVICE
    const productId = searchParams.get('productId')

    const where: any = { isPublished: true }
    if (type) where.type = type
    if (productId) where.productId = productId

    const reviews = await db.review.findMany({
      where,
      include: {
        client: {
          select: {
            name: true,
            phone: true,
          },
        },
        product: {
          select: {
            name: true,
            nameAr: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // Masquer partiellement le téléphone pour la confidentialité
    const sanitizedReviews = reviews.map((review) => ({
      ...review,
      client: {
        name: review.client.name || 'Client',
        phone: review.client.phone.replace(/(\d{3})(\d+)(\d{2})/, '$1***$3'),
      },
    }))

    return NextResponse.json(sanitizedReviews)
  } catch (error) {
    console.error('[Reviews] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create review (requires valid ClientToken and DELIVERED order)
export async function POST(request: NextRequest) {
  try {
    // Récupérer le token client depuis le cookie OU le header Authorization
    let clientToken = request.cookies.get('bm_client_token')?.value
    
    // Si pas de cookie, vérifier le header Authorization
    if (!clientToken) {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        clientToken = authHeader.substring(7)
      }
    }

    if (!clientToken) {
      return NextResponse.json(
        { error: 'Client token required' },
        { status: 401 }
      )
    }

    // Vérifier que le token existe
    const token = await db.clientToken.findUnique({
      where: { token: clientToken },
      include: { client: true },
    })

    if (!token || !token.client) {
      return NextResponse.json(
        { error: 'Invalid client token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { orderId, productId, type, rating, comment } = body

    // Validation
    if (!type || !['PRODUCT', 'SERVICE'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid review type. Must be PRODUCT or SERVICE' },
        { status: 400 }
      )
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Si orderId fourni, vérifier que la commande existe et est DELIVERED
    if (orderId) {
      const order = await db.order.findFirst({
        where: {
          id: orderId,
          clientId: token.clientId,
          status: 'DELIVERED',
        },
      })

      if (!order) {
        return NextResponse.json(
          { error: 'Order not found or not delivered' },
          { status: 400 }
        )
      }

      // Vérifier qu'un avis n'existe pas déjà pour cette commande + produit
      const existingReview = await db.review.findFirst({
        where: {
          clientId: token.clientId,
          orderId,
          productId: productId || null,
          type,
        },
      })

      if (existingReview) {
        return NextResponse.json(
          { error: 'Review already exists for this order' },
          { status: 400 }
        )
      }
    }

    // Créer l'avis
    const review = await db.review.create({
      data: {
        clientId: token.clientId,
        orderId: orderId || null,
        productId: productId || null,
        type,
        rating,
        comment: comment || null,
        isPublished: false, // Modération admin requise
      },
    })

    return NextResponse.json(review, { status: 201 })
  } catch (error) {
    console.error('[Reviews] POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
