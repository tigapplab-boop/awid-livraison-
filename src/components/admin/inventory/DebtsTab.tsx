'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatPrice } from '@/lib/inventory/calculations'

interface DebtReport {
  supplier: string
  totalDebt: number
  purchaseCount: number
  purchases: any[]
  oldestPurchase: Date
}

export default function DebtsTab() {
  const [debts, setDebts] = useState<DebtReport[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string[]>([])

  useEffect(() => {
    fetchDebts()
  }, [])

  const fetchDebts = async () => {
    try {
      const res = await fetch('/api/inventory/reports/debts')
      const data = await res.json()
      setDebts(data)
    } catch (error) {
      console.error('Failed to fetch debts:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (supplier: string) => {
    setExpanded((prev) =>
      prev.includes(supplier)
        ? prev.filter((s) => s !== supplier)
        : [...prev, supplier]
    )
  }

  const handlePayAll = async (supplier: string) => {
    const report = debts.find((d) => d.supplier === supplier)
    if (!report) return

    if (!confirm(`Marquer tous les achats de ${supplier} comme payés ?`)) return

    try {
      const purchaseIds = report.purchases.map((p) => p.id)
      await fetch('/api/inventory/purchases/pay-multiple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseIds, paymentMethod: 'Espèces' }),
      })
      fetchDebts()
    } catch (error) {
      console.error('Failed to pay all:', error)
      alert('Erreur lors du paiement')
    }
  }

  const totalDebt = debts.reduce((sum, d) => sum + d.totalDebt, 0)

  if (loading) {
    return <div className="animate-pulse p-8">Chargement...</div>
  }

  if (debts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
        <div className="text-green-600 text-6xl mb-4">✓</div>
        <h3 className="text-xl font-bold text-stone-900 mb-2">
          Aucune dette
        </h3>
        <p className="text-stone-500">
          Tous les achats sont payés. Félicitations !
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Total */}
      <div className="bg-gradient-to-br from-red-500 to-orange-500 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90 mb-1">Dette totale</p>
            <h2 className="text-4xl font-black">{formatPrice(totalDebt)}</h2>
            <p className="text-sm opacity-90 mt-2">
              {debts.length} fournisseur{debts.length > 1 ? 's' : ''}
            </p>
          </div>
          <AlertTriangle className="h-16 w-16 opacity-50" />
        </div>
      </div>

      {/* Liste des dettes par fournisseur */}
      <div className="space-y-3">
        {debts.map((report) => (
          <div
            key={report.supplier}
            className="bg-white rounded-xl border border-stone-200 overflow-hidden"
          >
            <div className="p-4 flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-bold text-lg text-stone-900">
                  {report.supplier}
                </h3>
                <div className="flex items-center gap-4 mt-1 text-sm text-stone-500">
                  <span>{report.purchaseCount} achats impayés</span>
                  <span>•</span>
                  <span>
                    Plus ancien:{' '}
                    {new Date(report.oldestPurchase).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-2xl font-black text-red-600">
                    {formatPrice(report.totalDebt)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handlePayAll(report.supplier)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <DollarSign className="h-4 w-4 mr-1" />
                    Tout payer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleExpanded(report.supplier)}
                  >
                    {expanded.includes(report.supplier) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Détails expandable */}
            {expanded.includes(report.supplier) && (
              <div className="border-t border-stone-200 bg-stone-50 p-4">
                <div className="space-y-2">
                  {report.purchases.map((purchase: any) => (
                    <div
                      key={purchase.id}
                      className="flex items-center justify-between bg-white p-3 rounded-lg border border-stone-200"
                    >
                      <div>
                        <div className="font-medium">{purchase.product.name}</div>
                        <div className="text-xs text-stone-500">
                          {new Date(purchase.purchaseDate).toLocaleDateString('fr-FR')} •{' '}
                          {purchase.purchaseNumber}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-stone-900">
                          {formatPrice(purchase.totalAmount)}
                        </div>
                        <div className="text-xs text-stone-500">
                          {purchase.quantity} {purchase.product.unit} × {formatPrice(purchase.unitPrice)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
