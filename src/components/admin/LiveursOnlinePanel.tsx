'use client'

// ========================================
// AWID / BURGER MINUTE - Livreurs Online Panel
// Affichage en temps réel des livreurs disponibles
// ========================================

import { useState, useEffect } from 'react'
import { Bike, Clock, Package, Wifi, WifiOff } from 'lucide-react'

interface Livreur {
  id: string
  name: string
  phone: string | null
  isAvailable: boolean
  isOnline: boolean
  lastSeenAt: string | null
  activeOrders: number
  availabilitySchedule: any
}

export default function LiveursOnlinePanel() {
  const [livreurs, setLivreurs] = useState<Livreur[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLivreurs = async () => {
    try {
      const token = localStorage.getItem('bm_token')
      const res = await fetch('/api/livreurs/online', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setLivreurs(data)
      }
    } catch (err) {
      console.error('[Livreurs Online] Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLivreurs()
    const interval = setInterval(fetchLivreurs, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [])

  const onlineLivreurs = livreurs.filter(l => l.isOnline && l.isAvailable)
  const offlineLivreurs = livreurs.filter(l => !l.isOnline || !l.isAvailable)

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-stone-200 rounded w-1/3" />
          <div className="h-16 bg-stone-200 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-stone-200 bg-gradient-to-r from-green-50 to-blue-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Bike className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900">Livreurs en ligne</h3>
              <p className="text-sm text-stone-500">
                {onlineLivreurs.length} disponible{onlineLivreurs.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-stone-600">Temps réel</span>
          </div>
        </div>
      </div>

      {/* Online Livreurs */}
      {onlineLivreurs.length > 0 && (
        <div className="p-4 space-y-2">
          {onlineLivreurs.map(livreur => (
            <div
              key={livreur.id}
              className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200 hover:bg-green-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                    <Bike className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                </div>
                <div>
                  <p className="font-semibold text-stone-900">{livreur.name}</p>
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <Wifi className="w-3 h-3 text-green-600" />
                    <span>En ligne</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-sm font-semibold text-stone-900">
                  <Package className="w-4 h-4" />
                  <span>{livreur.activeOrders}</span>
                </div>
                <p className="text-xs text-stone-500">commande{livreur.activeOrders > 1 ? 's' : ''}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {onlineLivreurs.length === 0 && (
        <div className="p-8 text-center">
          <WifiOff className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 font-medium">Aucun livreur en ligne</p>
          <p className="text-sm text-stone-400">Les livreurs apparaîtront ici en temps réel</p>
        </div>
      )}

      {/* Offline Livreurs (collapsed) */}
      {offlineLivreurs.length > 0 && (
        <details className="border-t border-stone-200">
          <summary className="px-6 py-3 cursor-pointer hover:bg-stone-50 transition-colors text-sm font-medium text-stone-600 flex items-center justify-between">
            <span>Hors ligne ({offlineLivreurs.length})</span>
            <Clock className="w-4 h-4" />
          </summary>
          <div className="px-4 pb-4 space-y-2">
            {offlineLivreurs.map(livreur => (
              <div
                key={livreur.id}
                className="flex items-center justify-between p-3 rounded-lg bg-stone-50 border border-stone-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-stone-300 flex items-center justify-center">
                    <Bike className="w-5 h-5 text-stone-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-stone-700">{livreur.name}</p>
                    <p className="text-xs text-stone-500">
                      {!livreur.isAvailable ? 'Indisponible' : 'Hors ligne'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
