'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Package, AlertTriangle, DollarSign, Users, ShoppingBag } from 'lucide-react'
import { formatPrice } from '@/lib/inventory/calculations'

interface SummaryData {
  totalProducts: number
  totalSuppliers: number
  totalPurchasesThisMonth: number
  totalPurchasesAmountThisMonth: number
  totalDebts: number
  totalUnpaidPurchases: number
  potentialProfit: number
  lowStockAlerts: number
  outOfStockAlerts: number
  topSupplierByDebt: string | null
  topProductByProfit: string | null
}

export default function ReportsTab() {
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSummary()
  }, [])

  const fetchSummary = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('bm_token') : null
      const res = await fetch('/api/inventory/reports/summary', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json()
      // Vérifier que c'est bien un objet summary (pas une erreur)
      if (data && typeof data.totalProducts === 'number') {
        setSummary(data)
      } else {
        console.error('Invalid summary data:', data)
      }
    } catch (error) {
      console.error('Failed to fetch summary:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !summary) {
    return <div className="animate-pulse p-8">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Achats ce mois */}
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingBag className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-xs text-stone-500">Ce mois</span>
          </div>
          <div className="text-2xl font-black text-stone-900 mb-1">
            {formatPrice(summary.totalPurchasesAmountThisMonth)}
          </div>
          <div className="text-sm text-stone-500">
            {summary.totalPurchasesThisMonth} achats
          </div>
        </div>

        {/* Dettes totales */}
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <span className="text-xs text-stone-500">À payer</span>
          </div>
          <div className="text-2xl font-black text-red-600 mb-1">
            {formatPrice(summary.totalDebts)}
          </div>
          <div className="text-sm text-stone-500">
            {summary.totalUnpaidPurchases} achats impayés
          </div>
        </div>

        {/* Bénéfice potentiel */}
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-xs text-stone-500">Potentiel</span>
          </div>
          <div className="text-2xl font-black text-green-600 mb-1">
            {formatPrice(summary.potentialProfit)}
          </div>
          <div className="text-sm text-stone-500">Si tout vendu</div>
        </div>

        {/* Alertes stock */}
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Package className="h-5 w-5 text-orange-600" />
            </div>
            <span className="text-xs text-stone-500">Stock</span>
          </div>
          <div className="text-2xl font-black text-orange-600 mb-1">
            {summary.lowStockAlerts + summary.outOfStockAlerts}
          </div>
          <div className="text-sm text-stone-500">
            {summary.outOfStockAlerts} ruptures, {summary.lowStockAlerts} alertes
          </div>
        </div>
      </div>

      {/* Statistiques détaillées */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inventaire */}
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <h3 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-bm-primary" />
            Inventaire
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-stone-600">Total produits</span>
              <span className="font-bold text-stone-900">{summary.totalProducts}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-600">Fournisseurs actifs</span>
              <span className="font-bold text-stone-900">{summary.totalSuppliers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-600">Produit le plus rentable</span>
              <span className="font-bold text-green-600">
                {summary.topProductByProfit || '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Fournisseurs */}
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <h3 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-bm-primary" />
            Fournisseurs
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-stone-600">Fournisseurs uniques</span>
              <span className="font-bold text-stone-900">{summary.totalSuppliers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-600">Plus grosse dette</span>
              <span className="font-bold text-red-600">
                {summary.topSupplierByDebt || '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-bold text-blue-900 mb-2">
          💡 À propos des rapports
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Bénéfice potentiel :</strong> Calculé sur le stock actuel (prix vente - prix achat × stock)</li>
          <li>• <strong>Achats ce mois :</strong> Tous les achats enregistrés ce mois, payés ou non</li>
          <li>• <strong>Alertes stock :</strong> Produits avec stock ≤ minimum configuré</li>
        </ul>
      </div>
    </div>
  )
}
