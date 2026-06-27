'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Package, Clock, CheckCircle, XCircle, Truck } from 'lucide-react'

interface Order {
  id: string
  orderNumber: string
  status: string
  total: number
  createdAt: string
  deliveredAt: string | null
  items: {
    id: string
    quantity: number
    price: number
    product: {
      name: string
      nameAr: string | null
      image: string | null
    }
    sauces: Array<{
      sauce: {
        name: string
        nameAr: string | null
      }
    }>
  }[]
}

const STATUS_CONFIG: Record<string, { label: string, labelAr: string, color: string, icon: any }> = {
  PENDING: { label: 'En attente', labelAr: 'قيد الانتظار', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  CONFIRMED: { label: 'Confirmée', labelAr: 'مؤكد', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  PREPARING: { label: 'En préparation', labelAr: 'قيد التحضير', color: 'bg-purple-100 text-purple-800', icon: Package },
  READY: { label: 'Prête', labelAr: 'جاهز', color: 'bg-green-100 text-green-800', icon: Package },
  DELIVERED: { label: 'Livrée', labelAr: 'تم التوصيل', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  CANCELLED: { label: 'Annulée', labelAr: 'ملغاة', color: 'bg-red-100 text-red-800', icon: XCircle },
}

export default function MesCommandesPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lang, setLang] = useState<'fr' | 'ar'>('fr')

  useEffect(() => {
    // Get language from localStorage
    const savedLang = localStorage.getItem('bm_lang')
    if (savedLang === 'ar') setLang('ar')

    // Fetch client orders
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/clients/me')
      
      if (!res.ok) {
        if (res.status === 401) {
          setError('Vous devez passer une commande d\'abord pour voir votre historique.')
        } else {
          setError('Erreur lors du chargement de vos commandes.')
        }
        return
      }

      const data = await res.json()
      setOrders(data.orders || [])
    } catch (err) {
      setError('Erreur de connexion. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (centimes: number) => {
    return (centimes / 100).toLocaleString('fr-FR')
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-bm-bg">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/menu"
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-stone-600" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-stone-900">
              {lang === 'ar' ? 'طلباتي' : 'Mes Commandes'}
            </h1>
            <p className="text-xs text-stone-500">
              {lang === 'ar' ? 'سجل طلباتك' : 'Historique de vos commandes'}
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-stone-200 rounded w-1/3 mb-3"></div>
                <div className="h-3 bg-stone-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-stone-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-stone-400" />
            </div>
            <p className="text-stone-600 mb-4">{error}</p>
            <Link
              href="/menu"
              className="inline-block bg-bm-primary text-stone-900 px-6 py-3 rounded-xl font-semibold hover:bg-[#FF8A00] transition-colors"
            >
              {lang === 'ar' ? 'تصفح القائمة' : 'Voir le menu'}
            </Link>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-stone-400" />
            </div>
            <h3 className="text-lg font-semibold text-stone-900 mb-2">
              {lang === 'ar' ? 'لا توجد طلبات' : 'Aucune commande'}
            </h3>
            <p className="text-stone-600 mb-4">
              {lang === 'ar' ? 'لم تقم بأي طلب بعد' : 'Vous n\'avez pas encore passé de commande'}
            </p>
            <Link
              href="/menu"
              className="inline-block bg-bm-primary text-stone-900 px-6 py-3 rounded-xl font-semibold hover:bg-[#FF8A00] transition-colors"
            >
              {lang === 'ar' ? 'تصفح القائمة' : 'Commander maintenant'}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING
              const StatusIcon = statusConfig.icon

              return (
                <Link
                  key={order.id}
                  href={`/order/${order.id}`}
                  className="block bg-white rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  {/* Order Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-stone-900">
                          {order.orderNumber}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${statusConfig.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {lang === 'ar' ? statusConfig.labelAr : statusConfig.label}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-stone-900">
                        {formatPrice(order.total)} DA
                      </p>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-2 border-t border-stone-100 pt-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        {item.product.image && (
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-900 truncate">
                            {item.quantity}x {lang === 'ar' && item.product.nameAr ? item.product.nameAr : item.product.name}
                          </p>
                          {item.sauces.length > 0 && (
                            <p className="text-xs text-stone-500 truncate">
                              {lang === 'ar' ? 'صلصة: ' : 'Sauces: '}
                              {item.sauces.map(s => lang === 'ar' && s.sauce.nameAr ? s.sauce.nameAr : s.sauce.name).join(', ')}
                            </p>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-stone-700">
                          {formatPrice(item.price * item.quantity)} DA
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* View Details */}
                  <div className="mt-3 pt-3 border-t border-stone-100">
                    <p className="text-sm text-blue-600 font-semibold flex items-center gap-1">
                      {lang === 'ar' ? 'عرض التفاصيل ←' : 'Voir les détails →'}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
