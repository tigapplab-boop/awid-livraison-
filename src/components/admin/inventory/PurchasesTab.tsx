'use client'

import { useState, useEffect } from 'react'
import { Plus, Eye, Pencil, Trash2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import PurchaseForm from './PurchaseForm'
import { formatPrice } from '@/lib/inventory/calculations'

interface Purchase {
  id: string
  purchaseNumber: string
  quantity: number
  unitPrice: number
  totalAmount: number
  supplier: string
  isPaid: boolean
  paidAt: Date | null
  paymentMethod: string | null
  notes: string | null
  invoiceNumber: string | null
  purchaseDate: Date
  product: {
    id: string
    name: string
    unit: string
  }
}

export default function PurchasesTab() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null)
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all')

  useEffect(() => {
    fetchPurchases()
  }, [filter])

  const fetchPurchases = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('bm_token') : null
      const params = new URLSearchParams()
      if (filter === 'paid') params.append('isPaid', 'true')
      if (filter === 'unpaid') params.append('isPaid', 'false')

      const res = await fetch(`/api/inventory/purchases?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json()
      setPurchases(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch purchases:', error)
      setPurchases([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingPurchase(null)
    setDialogOpen(true)
  }

  const handleEdit = (purchase: Purchase) => {
    setEditingPurchase(purchase)
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet achat ? Le stock sera ajusté.')) return

    try {
      await fetch(`/api/inventory/purchases/${id}`, { method: 'DELETE' })
      fetchPurchases()
    } catch (error) {
      console.error('Failed to delete purchase:', error)
      alert('Erreur lors de la suppression')
    }
  }

  const handleMarkPaid = async (id: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('bm_token') : null
    try {
      await fetch(`/api/inventory/purchases/${id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ paymentMethod: 'Espèces' }),
      })
      fetchPurchases()
    } catch (error) {
      console.error('Failed to mark as paid:', error)
    }
  }

  const handleSaved = () => {
    setDialogOpen(false)
    fetchPurchases()
  }

  if (loading) {
    return <div className="animate-pulse p-8">Chargement...</div>
  }

  return (
    <div>
      {/* Actions */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            size="sm"
          >
            Tous
          </Button>
          <Button
            variant={filter === 'unpaid' ? 'default' : 'outline'}
            onClick={() => setFilter('unpaid')}
            size="sm"
          >
            Impayés
          </Button>
          <Button
            variant={filter === 'paid' ? 'default' : 'outline'}
            onClick={() => setFilter('paid')}
            size="sm"
          >
            Payés
          </Button>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-bm-primary hover:bg-bm-primary/90 text-stone-900 font-bold"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouvel achat
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>N° Achat</TableHead>
              <TableHead>Produit</TableHead>
              <TableHead className="text-right">Quantité</TableHead>
              <TableHead className="text-right">Prix Unit.</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Fournisseur</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-stone-500">
                  Aucun achat trouvé.
                </TableCell>
              </TableRow>
            ) : (
              purchases.map((purchase) => (
                <TableRow key={purchase.id}>
                  <TableCell className="text-sm">
                    {new Date(purchase.purchaseDate).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {purchase.purchaseNumber}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{purchase.product.name}</div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {purchase.quantity} {purchase.product.unit}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatPrice(purchase.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold">
                    {formatPrice(purchase.totalAmount)}
                  </TableCell>
                  <TableCell className="text-stone-600">{purchase.supplier}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        purchase.isPaid
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }
                    >
                      {purchase.isPaid ? 'Payé' : 'Impayé'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!purchase.isPaid && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-green-600"
                          onClick={() => handleMarkPaid(purchase.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(purchase)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        onClick={() => handleDelete(purchase.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog */}
      <PurchaseForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        purchase={editingPurchase}
        onSaved={handleSaved}
      />
    </div>
  )
}
