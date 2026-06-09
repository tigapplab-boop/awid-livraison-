'use client'

import { Phone, Bike, Package, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface LivreurQuickCardProps {
  id: string
  name: string
  phone: string | null
  isAvailable: boolean
  isOnline: boolean
  activeOrders?: number
}

export default function LivreurQuickCard({ 
  id, 
  name, 
  phone, 
  isAvailable, 
  isOnline,
  activeOrders = 0 
}: LivreurQuickCardProps) {
  const handleCall = () => {
    if (phone) {
      window.location.href = `tel:${phone}`
    }
  }

  return (
    <div className={`relative rounded-xl border-2 p-4 transition-all ${
      isOnline && isAvailable
        ? 'border-green-200 bg-green-50/50'
        : 'border-stone-200 bg-white'
    }`}>
      {/* Online indicator */}
      {isOnline && isAvailable && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-green-600">EN LIGNE</span>
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
          isOnline && isAvailable ? 'bg-green-600' : 'bg-stone-400'
        }`}>
          <Bike className="w-6 h-6" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-stone-900 truncate">{name}</h3>
          {phone && (
            <p className="text-sm text-stone-600 font-mono">{phone}</p>
          )}
          
          <div className="flex items-center gap-2 mt-2">
            <Badge className={`text-[10px] px-2 py-0.5 ${
              isAvailable
                ? 'bg-green-100 text-green-700 border-green-200'
                : 'bg-stone-100 text-stone-600 border-stone-200'
            }`}>
              {isAvailable ? 'Disponible' : 'Indisponible'}
            </Badge>
            {activeOrders > 0 && (
              <Badge className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 border-blue-200">
                <Package className="w-3 h-3 mr-1" />
                {activeOrders}
              </Badge>
            )}
          </div>
        </div>

        {/* Call button */}
        {phone && (
          <button
            onClick={handleCall}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-bm-primary hover:bg-bm-primary-600 text-stone-900 transition-all hover:scale-105 active:scale-95"
            title={`Appeler ${name}`}
          >
            <Phone className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
