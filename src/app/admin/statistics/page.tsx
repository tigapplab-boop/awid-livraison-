'use client'

// ========================================
// AWID / BURGER MINUTE - Advanced Statistics Page
// Statistiques détaillées avec filtres
// ========================================

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  Users, 
  Calendar,
  BarChart3,
  RefreshCw,
  Download,
  Truck,
  ShoppingCart
} from 'lucide-react'
import { formatDA, formatTime } from '@/bm/lib/format'

interface Stats {
  summary: {
    totalOrders: number
    deliveredOrders: number
    cancelledOrders: number
    totalRevenue: number
    totalDeliveryFees: number
    onlineOrders: number
    phoneOrders: number
    posOrders: number
    paidOrders: number
    partialPayments: number
    offeredOrders: number
  }
  livreurStats: Array<{
    livreur: { id: string; name: string; phone: string | null }
    totalOrders: number
    deliveredOrders: number
    cancelledOrders: number
    totalRevenue: number
    totalDeliveryFees: number
  }>
  topProducts: Array<{
    product: { id: string; name: string; price: number }
    totalQuantity: number
    totalRevenue: number
    totalOrders: number
  }>
  productStats: any
  orders: any[]
}

interface Livreur {
  id: string
  name: string
  phone: string | null
}

interface Product {
  id: string
  name: string
  price: number
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [livreurs, setLivreurs] = useState<Livreur[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)

  // Filters
  const [startDate, setStartDate] = useState(() => {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    return firstDay.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [selectedLivreur, setSelectedLivreur] = useState<string>('')
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const token = typeof window !== 'undefined' ? localStorage.getItem('bm_token') : null

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (!loading) {
      fetchStats()
    }
  }, [startDate, endDate, selectedLivreur, selectedProduct])

  const fetchInitialData = async () => {
    try {
      const [livreursRes, productsRes] = await Promise.all([
        fetch('/api/livreurs', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/products'),
      ])

      if (livreursRes.ok) {
        const livreursData = await livreursRes.json()
        setLivreurs(livreursData)
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json()
        const allProducts: Product[] = []
        productsData.forEach((cat: any) => {
          cat.products.forEach((prod: any) => {
            allProducts.push(prod)
          })
        })
        setProducts(allProducts)
      }
    } catch (err) {
      console.error('Fetch initial data error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    setFetching(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      if (selectedLivreur) params.set('livreurId', selectedLivreur)
      if (selectedProduct) params.set('productId', selectedProduct)

      const res = await fetch(`/api/stats/advanced?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        throw new Error('Failed to fetch stats')
      }

      const data = await res.json()
      setStats(data)
    } catch (err) {
      console.error('Fetch stats error:', err)
      setMessage({ type: 'error', text: 'Erreur lors du chargement des statistiques' })
    } finally {
      setFetching(false)
    }
  }

  const handleQuickDate = (days: number) => {
    const today = new Date()
    const start = new Date()
    start.setDate(today.getDate() - days)
    setStartDate(start.toISOString().split('T')[0])
    setEndDate(today.toISOString().split('T')[0])
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-6">
        <div className="h-10 bg-stone-200 rounded-lg animate-pulse w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[0, 1, 2, 3].map(i => (
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
          <BarChart3 className="h-7 w-7 text-bm-primary" />
          Statistiques Avancées
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Analyse détaillée des commandes et performances
        </p>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
          message.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-2 opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">Date début</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-xs">Date fin</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-xs">Livreur</Label>
              <Select value={selectedLivreur} onValueChange={setSelectedLivreur}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Tous les livreurs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous les livreurs</SelectItem>
                  {livreurs.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Produit</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Tous les produits" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous les produits</SelectItem>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickDate(7)}
              className="text-xs"
            >
              7 derniers jours
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickDate(30)}
              className="text-xs"
            >
              30 derniers jours
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date()
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
                setStartDate(firstDay.toISOString().split('T')[0])
                setEndDate(today.toISOString().split('T')[0])
              }}
              className="text-xs"
            >
              Ce mois
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStats}
              disabled={fetching}
              className="ml-auto text-xs"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${fetching ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {stats && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-stone-500 font-medium">Total Commandes</p>
                    <p className="text-3xl font-black text-stone-900 mt-1">
                      {stats.summary.totalOrders}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      ✓ {stats.summary.deliveredOrders} livrées
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-stone-500 font-medium">Revenu Total</p>
                    <p className="text-3xl font-black text-green-600 mt-1">
                      {formatDA(stats.summary.totalRevenue)}
                    </p>
                    <p className="text-xs text-stone-500 mt-1">
                      Livraison: {formatDA(stats.summary.totalDeliveryFees)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-stone-500 font-medium">Par Source</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        🌐 {stats.summary.onlineOrders}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        📞 {stats.summary.phoneOrders}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        🏪 {stats.summary.posOrders}
                      </Badge>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-stone-500 font-medium">Paiements</p>
                    <div className="flex gap-2 mt-2">
                      <Badge className="bg-green-100 text-green-700 text-xs border-0">
                        ✓ {stats.summary.paidOrders}
                      </Badge>
                      <Badge className="bg-amber-100 text-amber-700 text-xs border-0">
                        ⚠️ {stats.summary.partialPayments}
                      </Badge>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Livreur Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Statistiques par Livreur
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {stats.livreurStats.length === 0 ? (
                    <div className="text-center py-12 text-stone-400 text-sm">
                      Aucune statistique livreur
                    </div>
                  ) : (
                    <div className="space-y-3 pr-4">
                      {stats.livreurStats.map((ls) => (
                        <div key={ls.livreur.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-bold text-stone-900">{ls.livreur.name}</p>
                              <p className="text-xs text-stone-500">{ls.livreur.phone}</p>
                            </div>
                            <Badge className="bg-bm-primary text-stone-900">
                              {ls.totalOrders} commandes
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-stone-500">Livrées</p>
                              <p className="font-bold text-green-600">{ls.deliveredOrders}</p>
                            </div>
                            <div>
                              <p className="text-xs text-stone-500">Annulées</p>
                              <p className="font-bold text-red-600">{ls.cancelledOrders}</p>
                            </div>
                            <div>
                              <p className="text-xs text-stone-500">Revenu total</p>
                              <p className="font-bold text-stone-900">{formatDA(ls.totalRevenue)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-stone-500">Frais livraison</p>
                              <p className="font-bold text-blue-600">{formatDA(ls.totalDeliveryFees)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Top Products */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Top 10 Produits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {stats.topProducts.length === 0 ? (
                    <div className="text-center py-12 text-stone-400 text-sm">
                      Aucun produit vendu
                    </div>
                  ) : (
                    <div className="space-y-3 pr-4">
                      {stats.topProducts.map((ps, idx) => (
                        <div key={ps.product.id} className="border rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-bm-primary flex items-center justify-center font-black text-stone-900">
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-stone-900">{ps.product.name}</p>
                              <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                                <div>
                                  <p className="text-stone-500">Quantité</p>
                                  <p className="font-bold text-stone-900">{ps.totalQuantity}</p>
                                </div>
                                <div>
                                  <p className="text-stone-500">Commandes</p>
                                  <p className="font-bold text-blue-600">{ps.totalOrders}</p>
                                </div>
                                <div>
                                  <p className="text-stone-500">Revenu</p>
                                  <p className="font-bold text-green-600">{formatDA(ps.totalRevenue)}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
