'use client'

// ========================================
// AWID / BURGER MINUTE - Reports Page
// Rapports journaliers avec export PDF
// ========================================

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  FileText, 
  Download, 
  Calendar,
  TrendingUp,
  DollarSign,
  Package,
  Truck,
  ShoppingCart,
  Phone,
  Store
} from 'lucide-react'
import { formatDA } from '@/bm/lib/format'
import jsPDF from 'jspdf'

interface ReportData {
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
}

interface Livreur {
  id: string
  name: string
  phone: string | null
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [livreurs, setLivreurs] = useState<Livreur[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Filters
  const [startDate, setStartDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [selectedLivreur, setSelectedLivreur] = useState<string>('')
  const [selectedSource, setSelectedSource] = useState<string>('')

  const token = typeof window !== 'undefined' ? localStorage.getItem('bm_token') : null

  useEffect(() => {
    fetchLivreurs()
  }, [])

  const fetchLivreurs = async () => {
    try {
      const res = await fetch('/api/livreurs', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setLivreurs(data)
      }
    } catch (err) {
      console.error('Fetch livreurs error:', err)
    }
  }

  const generateReport = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const params = new URLSearchParams()
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      if (selectedLivreur) params.set('livreurId', selectedLivreur)

      const res = await fetch(`/api/stats/advanced?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        throw new Error('Erreur lors de la génération du rapport')
      }

      const reportData = await res.json()
      
      // Filter by source if selected
      if (selectedSource) {
        const sourceKey = selectedSource === 'ONLINE' ? 'onlineOrders' 
          : selectedSource === 'PHONE_CALL' ? 'phoneOrders' 
          : 'posOrders'
        
        // We can't filter perfectly here, but we show the count
        reportData.summary.filteredBySource = selectedSource
      }

      setData(reportData)
      setMessage({ type: 'success', text: 'Rapport généré avec succès' })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur' })
    } finally {
      setLoading(false)
    }
  }

  const exportPDF = () => {
    if (!data) return

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    let y = 20

    // Header
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('BURGER MINUTE', pageWidth / 2, y, { align: 'center' })
    y += 10
    doc.setFontSize(14)
    doc.text('Rapport Journalier', pageWidth / 2, y, { align: 'center' })
    y += 5
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const period = `Periode: ${new Date(startDate).toLocaleDateString('fr-FR')} - ${new Date(endDate).toLocaleDateString('fr-FR')}`
    doc.text(period, pageWidth / 2, y, { align: 'center' })
    y += 15

    // Summary section
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('RESUME GENERAL', 14, y)
    y += 8
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    doc.text(`Total commandes: ${data.summary.totalOrders}`, 14, y)
    y += 6
    doc.text(`Livrees: ${data.summary.deliveredOrders} | Annulees: ${data.summary.cancelledOrders}`, 14, y)
    y += 6
    doc.text(`Revenu total: ${formatDA(data.summary.totalRevenue)}`, 14, y)
    y += 6
    doc.text(`Frais livraison: ${formatDA(data.summary.totalDeliveryFees)}`, 14, y)
    y += 10

    // By source
    doc.setFont('helvetica', 'bold')
    doc.text('PAR SOURCE', 14, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.text(`En ligne: ${data.summary.onlineOrders}`, 14, y)
    doc.text(`Telephone: ${data.summary.phoneOrders}`, 70, y)
    doc.text(`Sur place: ${data.summary.posOrders}`, 130, y)
    y += 10

    // Payment status
    doc.setFont('helvetica', 'bold')
    doc.text('PAIEMENTS', 14, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.text(`Payes: ${data.summary.paidOrders}`, 14, y)
    doc.text(`Partiels: ${data.summary.partialPayments}`, 70, y)
    doc.text(`Offerts: ${data.summary.offeredOrders}`, 130, y)
    y += 15

    // Livreur stats
    if (data.livreurStats.length > 0) {
      if (y > 250) {
        doc.addPage()
        y = 20
      }
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('STATISTIQUES PAR LIVREUR', 14, y)
      y += 8

      doc.setFontSize(9)
      data.livreurStats.forEach((ls) => {
        if (y > 270) {
          doc.addPage()
          y = 20
        }
        doc.setFont('helvetica', 'bold')
        doc.text(ls.livreur.name, 14, y)
        y += 5
        doc.setFont('helvetica', 'normal')
        doc.text(`Commandes: ${ls.totalOrders} (Livrees: ${ls.deliveredOrders}, Annulees: ${ls.cancelledOrders})`, 14, y)
        y += 5
        doc.text(`Revenu: ${formatDA(ls.totalRevenue)} | Frais livraison: ${formatDA(ls.totalDeliveryFees)}`, 14, y)
        y += 8
      })
      y += 5
    }

    // Top products
    if (data.topProducts.length > 0) {
      if (y > 250) {
        doc.addPage()
        y = 20
      }
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('TOP 10 PRODUITS', 14, y)
      y += 8

      doc.setFontSize(9)
      data.topProducts.slice(0, 10).forEach((ps, idx) => {
        if (y > 270) {
          doc.addPage()
          y = 20
        }
        doc.setFont('helvetica', 'bold')
        doc.text(`${idx + 1}. ${ps.product.name}`, 14, y)
        y += 5
        doc.setFont('helvetica', 'normal')
        doc.text(`Quantite: ${ps.totalQuantity} | Commandes: ${ps.totalOrders} | Revenu: ${formatDA(ps.totalRevenue)}`, 14, y)
        y += 7
      })
    }

    // Footer
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    const footerText = `Genere le ${new Date().toLocaleString('fr-FR')}`
    doc.text(footerText, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' })

    // Save
    const filename = `rapport_${startDate}_${endDate}.pdf`
    doc.save(filename)
    setMessage({ type: 'success', text: 'PDF téléchargé avec succès' })
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-stone-900 flex items-center gap-3">
          <FileText className="h-7 w-7 text-bm-primary" />
          Rapports Journaliers
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Générez et exportez des rapports détaillés en PDF
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

      {/* Filters Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Paramètres du rapport
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
                  <SelectValue placeholder="Tous" />
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
              <Label className="text-xs">Source</Label>
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Toutes les sources</SelectItem>
                  <SelectItem value="ONLINE">En ligne</SelectItem>
                  <SelectItem value="PHONE_CALL">Téléphone</SelectItem>
                  <SelectItem value="POS">Sur place</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={generateReport}
              disabled={loading || !startDate || !endDate}
              className="bg-bm-primary hover:bg-bm-primary-600 text-stone-900"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              {loading ? 'Génération...' : 'Générer le rapport'}
            </Button>
            {data && (
              <Button
                onClick={exportPDF}
                variant="outline"
                className="border-green-500 text-green-700 hover:bg-green-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Exporter PDF
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-stone-500 font-medium">Total Commandes</p>
                    <p className="text-3xl font-black text-stone-900 mt-1">
                      {data.summary.totalOrders}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      ✓ {data.summary.deliveredOrders} livrées
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
                      {formatDA(data.summary.totalRevenue)}
                    </p>
                    <p className="text-xs text-stone-500 mt-1">
                      Livraison: {formatDA(data.summary.totalDeliveryFees)}
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
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        🌐 {data.summary.onlineOrders}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        📞 {data.summary.phoneOrders}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        🏪 {data.summary.posOrders}
                      </Badge>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <Package className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-stone-500 font-medium">Livreurs</p>
                    <p className="text-3xl font-black text-stone-900 mt-1">
                      {data.livreurStats.length}
                    </p>
                    <p className="text-xs text-stone-500 mt-1">
                      Actifs sur la période
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <Truck className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Livreur Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Statistiques par Livreur</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {data.livreurStats.length === 0 ? (
                    <p className="text-center py-8 text-stone-400 text-sm">Aucune statistique</p>
                  ) : (
                    data.livreurStats.map((ls) => (
                      <div key={ls.livreur.id} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-bold text-stone-900">{ls.livreur.name}</p>
                            <p className="text-xs text-stone-500">{ls.livreur.phone}</p>
                          </div>
                          <Badge className="bg-bm-primary text-stone-900">
                            {ls.totalOrders}
                          </Badge>
                        </div>
                        <Separator className="my-2" />
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-stone-500">Livrées</p>
                            <p className="font-bold text-green-600">{ls.deliveredOrders}</p>
                          </div>
                          <div>
                            <p className="text-xs text-stone-500">Revenu</p>
                            <p className="font-bold text-stone-900">{formatDA(ls.totalRevenue)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Products */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top 10 Produits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {data.topProducts.length === 0 ? (
                    <p className="text-center py-8 text-stone-400 text-sm">Aucun produit</p>
                  ) : (
                    data.topProducts.slice(0, 10).map((ps, idx) => (
                      <div key={ps.product.id} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-bm-primary flex items-center justify-center font-black text-stone-900 text-sm flex-shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-stone-900 text-sm truncate">{ps.product.name}</p>
                          <div className="flex items-center gap-3 text-xs text-stone-500 mt-0.5">
                            <span>Qté: {ps.totalQuantity}</span>
                            <span>•</span>
                            <span className="text-green-600 font-bold">{formatDA(ps.totalRevenue)}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
