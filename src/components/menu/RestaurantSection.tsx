'use client'

import { useEffect, useState } from 'react'
import { RestaurantGallery } from './RestaurantGallery'
import { RestaurantInfo } from './RestaurantInfo'

interface RestaurantData {
  phone: string
  address: string
  lat: number
  lng: number
  mapsUrl: string
  gallery?: string[]
}

interface RestaurantSectionProps {
  isRTL: boolean
}

export function RestaurantSection({ isRTL }: RestaurantSectionProps) {
  const [info, setInfo] = useState<RestaurantData | null>(null)

  useEffect(() => {
    fetch('/api/settings/restaurant-info')
      .then((res) => res.json())
      .then((data) => setInfo(data))
      .catch(console.error)
  }, [])

  if (!info) return null

  return (
    <>
      {/* Gallery */}
      {info.gallery && info.gallery.length > 0 && (
        <RestaurantGallery images={info.gallery} />
      )}

      {/* Contact Info */}
      <RestaurantInfo isRTL={isRTL} />
    </>
  )
}
