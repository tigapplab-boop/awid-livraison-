'use client'

import { useEffect, useState } from 'react'
import { Star, Trash2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Review {
  id: string
  type: string
  rating: number
  comment: string | null
  isPublished: boolean
  createdAt: string
  client: {
    name: string | null
    phone: string
  }
  order: {
    orderNumber: string
    status: string
  } | null
  product: {
    name: string
    nameAr: string | null
  } | null
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [filter, setFilter] = useState<'all' | 'published' | 'pending'>('all')
  const [loading, setLoading] = useState(true)

  const fetchReviews = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/reviews/admin?status=${filter}`)
      if (res.ok) {
        const data = await res.json()
        setReviews(data)
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [filter])

  const togglePublish = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !currentStatus }),
      })

      if (res.ok) {
        fetchReviews()
      }
    } catch (error) {
      console.error('Error toggling publish:', error)
    }
  }

  const deleteReview = async (id: string) => {
    if (!confirm('Supprimer cet avis ?')) return

    try {
      const res = await fetch(`/api/reviews/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchReviews()
      }
    } catch (error) {
      console.error('Error deleting review:', error)
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < rating ? 'fill-bm-primary text-bm-primary' : 'text-stone-600'
            }`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-stone-50 mb-2">Avis Clients</h1>
        <p className="text-stone-400">Modération des avis produits et service</p>
      </div>

      <div className="bg-stone-800/50 backdrop-blur-sm border border-stone-700 rounded-lg p-6">
        <div className="mb-6 flex items-center gap-4">
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les avis</SelectItem>
              <SelectItem value="published">Publiés</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
            </SelectContent>
          </Select>

          <div className="text-sm text-stone-400">
            {reviews.length} avis trouvé{reviews.length > 1 ? 's' : ''}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-stone-400">Chargement...</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8 text-stone-400">Aucun avis</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Commentaire</TableHead>
                  <TableHead>Commande</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-stone-200">
                          {review.client.name || 'Client'}
                        </div>
                        <div className="text-xs text-stone-500">
                          {review.client.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          review.type === 'PRODUCT' ? 'default' : 'secondary'
                        }
                      >
                        {review.type === 'PRODUCT' ? 'Produit' : 'Service'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {review.product ? (
                        <span className="text-stone-300">{review.product.name}</span>
                      ) : (
                        <span className="text-stone-500">-</span>
                      )}
                    </TableCell>
                    <TableCell>{renderStars(review.rating)}</TableCell>
                    <TableCell className="max-w-xs">
                      <div className="text-sm text-stone-300 truncate">
                        {review.comment || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {review.order ? (
                        <div>
                          <div className="text-stone-300 text-xs">
                            {review.order.orderNumber}
                          </div>
                          <Badge variant="outline" className="text-xs mt-1">
                            {review.order.status}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-stone-500">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm">
                      {new Date(review.createdAt).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={review.isPublished ? 'default' : 'secondary'}
                      >
                        {review.isPublished ? 'Publié' : 'En attente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            togglePublish(review.id, review.isPublished)
                          }
                        >
                          {review.isPublished ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteReview(review.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
