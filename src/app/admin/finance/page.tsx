'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { DollarSign, TrendingUp, AlertTriangle, Gift, Filter } from 'lucide-react'
import { formatDA } from '@/bm/lib/format'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface FinanceOrder {
  id: string
  orderNumber: string
  source: string
  status: string
  clientPhone: string
  clientAddress: string
  subtotal: number
  total: number
  deliveryFee: number
  amountPaid: number | null
  changeDue: number | null
  paymentMethod: string
  paymentStatus: string
  paymentIssue: string
  paymentIssueNote: string | null
  createdAt: string
  deliveredAt: string | null
  assignedLivreur: { id: string; name: string } | null
  items: Array<{
    id: string
    productId: string
    quantity: number
    price: number
    product: { name: string }
  }>
}

interface FinanceSummary {
  totalOrders: number
  totalRevenue: number
  totalPaid: number
  totalPending: number
  totalPartial: number
  totalOffered: number
  totalDeliveryFees: number
}

type FilterStatus = 'ALL' | 'PAID' | 'PENDING' | 'PARTIAL' | 'OFFERED' | 'REFUNDED'

function getPaymentBadge(status: string) {
  switch (status) {
    case 'PAID':
      return <Badge className="bg-emerald-100 text-emerald-700 border-0">Payé</Badge>
    case 'PENDING':
      return <Badge className="bg-amber-100 text-amber-700 border-0">En attente</Badge>
    case 'PARTIAL':
      return <Badge className="bg-red-100 text-red-700 border-0">Partiel</Badge>
    case 'OFFERED':
      return <Badge className="bg-purple-100 text-purple-700 border-0">Offert</Badge>
    case 'REFUNDED':
      return <Badge className="bg-stone-100 text-stone-700 border-0">Remboursé</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function getSourceBadge(source: string) {
  switch (source) {
    case 'ONLINE':
      return <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-600">🌐 Online</Badge>
    case 'PHONE_CALL':
      return <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-600">📞 Tél.</Badge>
    default:
      return <Badge variant="outline" className="text-[10px]">{source}</Badge>
  }
}

export default function FinancePage() {
  const [orders, setOrders] = useState<FinanceOrder[]>([])
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('ALL')

  const token = typeof window !== 'undefined' ? localStorage.getItem('bm_token') : null

  const fetchFinance = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filter !== 'ALL') params.set('paymentStatus', filter)

      const res = await fetch(`/api/finance?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders)
        setSummary(data.summary)
      }
    } catch {
      console.error('Fetch error')
    } finally {
      setLoading(false)
    }
  }, [token, filter])

  useEffect(() => {
    fetchFinance()
  }, [fetchFinance])

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-stone-900">Finance</h1>
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterStatus)}>
          <SelectTrigger className="w-44 min-h-[48px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tout</SelectItem>
            <SelectItem value="PAID">Payé</SelectItem>
            <SelectItem value="PENDING">En attente</SelectItem>
            <SelectItem value="PARTIAL">Partiel</SelectItem>
            <SelectItem value="OFFERED">Offert</SelectItem>
            <SelectItem value="REFUNDED">Remboursé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="border-2 border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-emerald-600 mb-1">
                <DollarSign className="h-5 w-5" />
                <span className="text-xs font-medium">Revenu Total</span>
              </div>
              <p className="text-xl font-extrabold text-stone-900">{formatDA(summary.totalRevenue)}</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <TrendingUp className="h-5 w-5" />
                <span className="text-xs font-medium">Payé</span>
              </div>
              <p className="text-xl font-extrabold text-stone-900">{formatDA(summary.totalPaid)}</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-amber-200 bg-amber-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-amber-600 mb-1">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-xs font-medium">En attente</span>
              </div>
              <p className="text-xl font-extrabold text-stone-900">{formatDA(summary.totalPending)}</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-purple-200 bg-purple-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-purple-600 mb-1">
                <Gift className="h-5 w-5" />
                <span className="text-xs font-medium">Offert</span>
              </div>
              <p className="text-xl font-extrabold text-stone-900">{formatDA(summary.totalOffered)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Orders Table */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold">
            Détail des commandes ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[calc(100vh-400px)]">
            {/* Mobile Cards */}
            <div className="lg:hidden space-y-2 p-4">
              {orders.map((order) => (
                <Card key={order.id} className="border bg-stone-50">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-bm-primary">{order.orderNumber}</span>
                      {getPaymentBadge(order.paymentStatus)}
                    </div>
                    <div className="flex items-center gap-2">
                      {getSourceBadge(order.source)}
                      <span className="text-xs text-stone-500">{formatDate(order.createdAt)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-600">Total</span>
                      <span className="font-bold">{formatDA(order.total)}</span>
                    </div>
                    {order.amountPaid !== null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-stone-600">Reçu</span>
                        <span className="font-medium text-emerald-700">{formatDA(order.amountPaid)}</span>
                      </div>
                    )}
                    {order.changeDue !== null && order.changeDue > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-stone-600">Rendu</span>
                        <span className="font-medium text-blue-700">{formatDA(order.changeDue)}</span>
                      </div>
                    )}
                    {order.paymentIssue && order.paymentIssue !== 'NONE' && (
                      <div className="text-xs text-red-600 bg-red-50 rounded p-1.5">
                        ⚠️ {order.paymentIssue.replace(/_/g, ' ')}
                      </div>
                    )}
                    {order.assignedLivreur && (
                      <div className="text-xs text-stone-500">🛵 {order.assignedLivreur.name}</div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {orders.length === 0 && (
                <div className="text-center py-8 text-stone-400 text-sm">Aucune commande trouvée</div>
              )}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>N° Commande</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Reçu</TableHead>
                    <TableHead className="text-right">Rendu</TableHead>
                    <TableHead>Problème</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="text-sm text-stone-600 whitespace-nowrap">
                        {formatDate(order.createdAt)}
                      </TableCell>
                      <TableCell className="font-bold text-bm-primary">{order.orderNumber}</TableCell>
                      <TableCell>{getSourceBadge(order.source)}</TableCell>
                      <TableCell className="text-right font-bold">{formatDA(order.total)}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-700">
                        {order.amountPaid !== null ? formatDA(order.amountPaid) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-blue-700">
                        {order.changeDue !== null && order.changeDue > 0 ? formatDA(order.changeDue) : '-'}
                      </TableCell>
                      <TableCell>
                        {order.paymentIssue && order.paymentIssue !== 'NONE' ? (
                          <Badge className="bg-red-100 text-red-700 border-0 text-[10px]">
                            ⚠️ {order.paymentIssue.replace(/_/g, ' ')}
                          </Badge>
                        ) : (
                          <span className="text-stone-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getPaymentBadge(order.paymentStatus)}</TableCell>
                    </TableRow>
                  ))}
                  {orders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-stone-400">
                        Aucune commande trouvée
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
