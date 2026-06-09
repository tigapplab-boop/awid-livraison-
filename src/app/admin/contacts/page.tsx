'use client'

import { useState, useEffect } from 'react'
import { Phone, Search, Bike } from 'lucide-react'
import { Input } from '@/components/ui/input'
import LivreurQuickCard from '@/components/admin/LivreurQuickCard'

interface Livreur {
  id: string
  name: string
  phone: string | null
  isAvailable: boolean
  isOnline: boolean
  lastSeenAt: string | null
}

export default function ContactsPage() {
  const [livreurs, setLivreurs] = useState<Livreur[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const token = typeof window !== 'undefined' ? localStorage.getItem('bm_token') : null

  useEffect(() => {
    fetchLivreurs()
    const interval = setInterval(fetchLivreurs, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchLivreurs = async () => {
    try {
      const res = await fetch('/api/livreurs/online', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setLivreurs(data)
      }
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredLivreurs = livreurs.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.phone?.includes(search)
  )

  const onlineLivreurs = filteredLivreurs.filter(l => l.isOnline && l.isAvailable)
  const offlineLivreurs = filteredLivreurs.filter(l => !l.isOnline || !l.isAvailable)

  if (loading) {
    return (
      <div className="p-4 lg:p-6">
        <div className="h-10 bg-stone-200 rounded-lg animate-pulse w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-32 bg-stone-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-stone-900 flex items-center gap-3">
          <Phone className="h-7 w-7 text-bm-primary" />
          Contacts Livreurs
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Appels rapides - {onlineLivreurs.length} en ligne
        </p>
      </div>

      {/* Search */}
      <div className="mb-6 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
          <Input
            type="text"
            placeholder="Rechercher par nom ou téléphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12"
          />
        </div>
      </div>

      {/* Online Livreurs */}
      {onlineLivreurs.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-green-600 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            En Ligne ({onlineLivreurs.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {onlineLivreurs.map(livreur => (
              <LivreurQuickCard
                key={livreur.id}
                {...livreur}
                isOnline={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Offline Livreurs */}
      {offlineLivreurs.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-4">
            Hors Ligne ({offlineLivreurs.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {offlineLivreurs.map(livreur => (
              <LivreurQuickCard
                key={livreur.id}
                {...livreur}
                isOnline={false}
              />
            ))}
          </div>
        </div>
      )}

      {filteredLivreurs.length === 0 && (
        <div className="text-center py-12">
          <Bike className="w-16 h-16 text-stone-300 mx-auto mb-4" />
          <p className="text-stone-500 font-medium">Aucun livreur trouvé</p>
        </div>
      )}
    </div>
  )
}
