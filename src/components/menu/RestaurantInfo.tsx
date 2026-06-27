'use client'

import { useEffect, useState } from 'react'
import { MapPin, Phone } from 'lucide-react'

interface RestaurantInfoProps {
  isRTL: boolean
}

interface RestaurantData {
  phone: string
  address: string
  lat: number
  lng: number
  mapsUrl: string
  gallery?: string[]
}

export function RestaurantInfo({ isRTL }: RestaurantInfoProps) {
  const [info, setInfo] = useState<RestaurantData | null>(null)

  useEffect(() => {
    fetch('/api/settings/restaurant-info')
      .then((res) => res.json())
      .then((data) => setInfo(data))
      .catch(console.error)
  }, [])

  if (!info) return null

  return (
    <div className="px-4 py-8 border-t border-stone-200 bg-white/50">
      <div className="max-w-lg mx-auto space-y-4">
        <h3 className="text-lg font-bold text-stone-800 text-center mb-4">
          {isRTL ? 'معلومات الاتصال' : 'Nous contacter'}
        </h3>

        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="w-10 h-10 bg-bm-primary/10 rounded-full flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5 text-bm-primary" />
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-xs text-stone-500 font-medium">
              {isRTL ? 'هاتف' : 'Téléphone'}
            </p>
            <a
              href={`tel:${info.phone}`}
              className="text-sm font-semibold text-stone-800 hover:text-bm-primary transition-colors"
            >
              {info.phone}
            </a>
          </div>
        </div>

        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="w-10 h-10 bg-bm-primary/10 rounded-full flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-bm-primary" />
          </div>
          <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            <p className="text-xs text-stone-500 font-medium">
              {isRTL ? 'عنوان' : 'Adresse'}
            </p>
            <p className="text-sm font-semibold text-stone-800">{info.address}</p>
          </div>
        </div>

        {info.mapsUrl && (
          <a
            href={info.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-bm-primary text-stone-900 px-4 py-3 rounded-xl text-sm font-bold text-center hover:bg-[#FF8A00] active:scale-95 transition-all shadow-sm"
          >
            {isRTL ? 'عرض على خرائط جوجل' : 'Voir sur Google Maps'}
          </a>
        )}
      </div>
    </div>
  )
}
