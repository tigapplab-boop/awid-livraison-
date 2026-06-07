'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, ShoppingBag, Clock, DollarSign, Phone, Globe, Monitor } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts'
import { formatDA } from '@/bm/lib/format'

interface Stats {
  today: {
    totalOrders: number
    totalRevenue: number
    totalDeliveryFees: number
    onlineOrders: number
    phoneOrders: number
    posOrders: number
  }
  week: {
    totalOrders: number
    totalRevenue: number
  }
  month: {
    totalOrders: number
    totalRevenue: number
    totalDeliveryFees: number
  }
  recent: {
    last24h: number
  }
}

const COLORS = ['#FFD700', '#DC2626', '#F59E0B', '#16a34a', '#78716c']

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const token = typeof window !== 'undefined' ? localStorage.getItem('bm_token') : null

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setStats(await res.json())
    } catch {
      console.error('Fetch error')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="p-4 lg:p-6 text-center text-stone-400 py-20">
        Impossible de charger les statistiques
      </div>
    )
  }

  const panierMoyen = stats.today.totalOrders > 0
    ? Math.round(stats.today.totalRevenue / stats.today.totalOrders)
    : 0

  // Source pie data
  const sourceData = [
    { name: 'Online', value: stats.today.onlineOrders, color: '#FFD700' },
    { name: 'Téléphone', value: stats.today.phoneOrders, color: '#DC2626' },
    { name: 'POS', value: stats.today.posOrders, color: '#FBBF24' },
  ].filter((d) => d.value > 0)

  // Hourly revenue mock data (since we don't have hourly breakdown, show by source)
  const revenueBySource = [
    { name: 'Online', revenue: stats.today.totalRevenue * (stats.today.onlineOrders / Math.max(1, stats.today.totalOrders)) / 100 },
    { name: 'Téléphone', revenue: stats.today.totalRevenue * (stats.today.phoneOrders / Math.max(1, stats.today.totalOrders)) / 100 },
    { name: 'POS', revenue: stats.today.totalRevenue * (stats.today.posOrders / Math.max(1, stats.today.totalOrders)) / 100 },
  ].filter((d) => d.revenue > 0)

  // Comparison bars
  const comparisonData = [
    { name: "Aujourd'hui", revenue: stats.today.totalRevenue / 100, orders: stats.today.totalOrders },
    { name: 'Semaine', revenue: stats.week.totalRevenue / 100, orders: stats.week.totalOrders },
    { name: 'Mois', revenue: stats.month.totalRevenue / 100, orders: stats.month.totalOrders },
  ]

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <h1 className="text-2xl font-extrabold text-stone-900">Statistiques</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="border-2 border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <DollarSign className="h-5 w-5" />
              <span className="text-xs font-medium">CA Jour</span>
            </div>
            <p className="text-2xl font-extrabold text-stone-900">{formatDA(stats.today.totalRevenue)}</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <TrendingUp className="h-5 w-5" />
              <span className="text-xs font-medium">CA Semaine</span>
            </div>
            <p className="text-2xl font-extrabold text-stone-900">{formatDA(stats.week.totalRevenue)}</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <TrendingUp className="h-5 w-5" />
              <span className="text-xs font-medium">CA Mois</span>
            </div>
            <p className="text-2xl font-extrabold text-stone-900">{formatDA(stats.month.totalRevenue)}</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200 bg-purple-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-2">
              <ShoppingBag className="h-5 w-5" />
              <span className="text-xs font-medium">Commandes</span>
            </div>
            <p className="text-2xl font-extrabold text-stone-900">{stats.today.totalOrders}</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-200 bg-orange-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-600 mb-2">
              <Clock className="h-5 w-5" />
              <span className="text-xs font-medium">Panier Moyen</span>
            </div>
            <p className="text-2xl font-extrabold text-stone-900">{formatDA(panierMoyen)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue by Source Bar Chart */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-bm-primary" />
              Revenu par Source (DA)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueBySource.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={revenueBySource}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(0)} DA`, 'Revenu']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4' }}
                  />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                    {revenueBySource.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-stone-400 text-sm">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orders by Source Pie Chart */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-bm-primary" />
              Commandes par Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-stone-400 text-sm">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparison Chart */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-bm-primary" />
            Comparaison Revenu & Commandes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="name" tick={{ fontSize: 13 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4' }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="revenue" name="Revenu (DA)" fill="#FFD700" radius={[6, 6, 0, 0]} />
              <Bar yAxisId="right" dataKey="orders" name="Commandes" fill="#16a34a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Delivery Fees */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-bm-primary mb-2">
              <Globe className="h-5 w-5" />
              <span className="text-xs font-medium">Frais livraison (aujourd&apos;hui)</span>
            </div>
            <p className="text-2xl font-extrabold text-stone-900">{formatDA(stats.today.totalDeliveryFees)}</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <Phone className="h-5 w-5" />
              <span className="text-xs font-medium">Commandes téléphone</span>
            </div>
            <p className="text-2xl font-extrabold text-stone-900">{stats.today.phoneOrders}</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <Monitor className="h-5 w-5" />
              <span className="text-xs font-medium">Commandes en ligne</span>
            </div>
            <p className="text-2xl font-extrabold text-stone-900">{stats.today.onlineOrders}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
