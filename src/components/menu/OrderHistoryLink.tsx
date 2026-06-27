'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Package, ChevronRight } from 'lucide-react'

interface OrderHistoryLinkProps {
  locale: string
}

export function OrderHistoryLink({ locale }: OrderHistoryLinkProps) {
  const [hasOrders, setHasOrders] = useState(false)
  const [loading, setLoading] = useState(true)
  const isRTL = locale === 'ar'

  useEffect(() => {
    // Check if client has orders
    const checkOrders = async () => {
      try {
        const res = await fetch('/api/clients/me')
        if (res.ok) {
          const data = await res.json()
          setHasOrders(data.orders && data.orders.length > 0)
        }
      } catch (error) {
        // Silently fail - client probably hasn't ordered yet
      } finally {
        setLoading(false)
      }
    }
    checkOrders()
  }, [])

  // Don't show if loading or no orders
  if (loading || !hasOrders) return null

  return (
    <div className="px-4 py-2">
      <Link
        href="/mes-commandes"
        className={`block bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-3 hover:border-blue-300 hover:shadow-md transition-all ${
          isRTL ? 'text-right' : 'text-left'
        }`}
      >
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-blue-900 text-sm">
              {isRTL ? 'طلباتي السابقة' : 'Mes Commandes Précédentes'}
            </p>
            <p className="text-xs text-blue-700">
              {isRTL ? 'عرض سجل طلباتك' : 'Consultez votre historique'}
            </p>
          </div>
          <ChevronRight className={`w-5 h-5 text-blue-600 shrink-0 ${isRTL ? 'rotate-180' : ''}`} />
        </div>
      </Link>
    </div>
  )
}
