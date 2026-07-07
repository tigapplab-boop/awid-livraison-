'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'

interface Review {
  id: string
  type: string
  rating: number
  comment: string | null
  createdAt: string
  client: {
    name: string
    phone: string
  }
}

interface ReviewsSectionProps {
  locale: string
  isRTL: boolean
}

export function ReviewsSection({ locale, isRTL }: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReviews() {
      try {
        const res = await fetch('/api/reviews?type=SERVICE')
        if (res.ok) {
          const data = await res.json()
          // Only show top 10 most recent
          setReviews(data.slice(0, 10))
        }
      } catch (err) {
        console.error('Failed to fetch reviews:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchReviews()
  }, [])

  if (loading || reviews.length === 0) {
    return null
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${
              i < rating ? 'fill-bm-primary text-bm-primary' : 'text-stone-300'
            }`}
          />
        ))}
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return isRTL ? 'اليوم' : 'Aujourd\'hui'
    if (diffDays === 1) return isRTL ? 'أمس' : 'Hier'
    if (diffDays < 7) return isRTL ? `منذ ${diffDays} أيام` : `Il y a ${diffDays} jours`
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7)
      return isRTL ? `منذ ${weeks} ${weeks > 1 ? 'أسابيع' : 'أسبوع'}` : `Il y a ${weeks} semaine${weeks > 1 ? 's' : ''}`
    }
    return date.toLocaleDateString(locale === 'ar' ? 'ar-DZ' : 'fr-FR', {
      day: 'numeric',
      month: 'short',
    })
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-stone-900 tracking-tight">
          {isRTL ? '⭐ آراء العملاء' : '⭐ Avis clients'}
        </h2>
        <p className="text-xs text-stone-500 mt-0.5">
          {isRTL ? `${reviews.length} تقييمات` : `${reviews.length} avis`}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100/50"
          >
            {/* Header */}
            <div className={`flex items-start justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="font-bold text-stone-900 text-sm">
                  {review.client.name || (isRTL ? 'عميل' : 'Client')}
                </p>
                <p className="text-xs text-stone-400">
                  {formatDate(review.createdAt)}
                </p>
              </div>
              {renderStars(review.rating)}
            </div>

            {/* Comment */}
            {review.comment && (
              <p
                className="text-sm text-stone-600 leading-relaxed mt-2"
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                "{review.comment}"
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
