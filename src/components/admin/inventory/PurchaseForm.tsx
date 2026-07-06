'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface PurchaseFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  purchase: any | null
  onSaved: () => void
}

export default function PurchaseForm({ open, onOpenChange, purchase, onSaved }: PurchaseFormProps) {
  const [products, setProducts] = useState<any[]>([])
  const [formData, setFormData] = useState({
    productId: '',
    quantity: '',
    unitPrice: '',
    supplier: '',
    isPaid: false,
    paymentMethod: 'Espèces',
    notes: '',
    invoiceNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    if (purchase) {
      setFormData({
        productId: purchase.product.id,
        quantity: purchase.quantity.toString(),
        unitPrice: (purchase.unitPrice / 100).toString(),
        supplier: purchase.supplier,
        isPaid: purchase.isPaid,
        paymentMethod: purchase.paymentMethod || 'Espèces',
        notes: purchase.notes || '',
        invoiceNumber: purchase.invoiceNumber || '',
        purchaseDate: new Date(purchase.purchaseDate).toISOString().split('T')[0],
      })
    } else {
      setFormData({
        productId: '',
        quantity: '',
        unitPrice: '',
        supplier: '',
        isPaid: false,
        paymentMethod: 'Espèces',
        notes: '',
        invoiceNumber: '',
        purchaseDate: new Date().toISOString().split('T')[0],
      })
    }
  }, [purchase])

  const fetchProducts = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('bm_token') : null
      const res = await fetch('/api/inventory/products', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json()
      setProducts(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch products:', error)
      setProducts([])
    }
  }

  const handleSave = async () => {
    if (!formData.productId || !formData.quantity || !formData.unitPrice || !formData.supplier) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    setSaving(true)

    try {
      const body = {
        productId: formData.productId,
        quantity: parseFloat(formData.quantity),
        unitPrice: Math.round(parseFloat(formData.unitPrice) * 100),
        supplier: formData.supplier,
        isPaid: formData.isPaid,
        paymentMethod: formData.isPaid ? formData.paymentMethod : null,
        notes: formData.notes || null,
        invoiceNumber: formData.invoiceNumber || null,
        purchaseDate: formData.purchaseDate,
      }

      const url = purchase
        ? `/api/inventory/purchases/${purchase.id}`
        : '/api/inventory/purchases'
      const method = purchase ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        throw new Error('Failed to save')
      }

      onSaved()
    } catch (error) {
      console.error('Failed to save purchase:', error)
      alert('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const totalAmount = formData.quantity && formData.unitPrice
    ? (parseFloat(formData.quantity) * parseFloat(formData.unitPrice)).toFixed(2)
    : '0.00'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {purchase ? 'Modifier l\'achat' : 'Nouvel achat'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="col-span-2">
            <Label htmlFor="productId">Produit *</Label>
            <Select
              value={formData.productId}
              onValueChange={(v) => {
                const product = products.find((p) => p.id === v)
                setFormData({
                  ...formData,
                  productId: v,
                  supplier: product?.supplier || formData.supplier,
                  unitPrice: product ? (product.purchasePrice / 100).toString() : formData.unitPrice,
                })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un produit" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} ({product.supplier})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="quantity">Quantité *</Label>
            <Input
              id="quantity"
              type="number"
              step="0.1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="10"
            />
          </div>

          <div>
            <Label htmlFor="unitPrice">Prix unitaire (DA) *</Label>
            <Input
              id="unitPrice"
              type="number"
              step="0.01"
              value={formData.unitPrice}
              onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
              placeholder="150.00"
            />
          </div>

          <div className="col-span-2">
            <Label>Total à payer</Label>
            <div className="text-2xl font-bold text-bm-primary mt-2">
              {totalAmount} DA
            </div>
          </div>

          <div>
            <Label htmlFor="supplier">Fournisseur *</Label>
            <Input
              id="supplier"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              placeholder="Nom du fournisseur"
            />
          </div>

          <div>
            <Label htmlFor="purchaseDate">Date d'achat</Label>
            <Input
              id="purchaseDate"
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="invoiceNumber">N° Facture</Label>
            <Input
              id="invoiceNumber"
              value={formData.invoiceNumber}
              onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
              placeholder="Optionnel"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isPaid"
              checked={formData.isPaid}
              onCheckedChange={(checked) => setFormData({ ...formData, isPaid: checked })}
            />
            <Label htmlFor="isPaid">Marquer comme payé</Label>
          </div>

          {formData.isPaid && (
            <div>
              <Label htmlFor="paymentMethod">Méthode de paiement</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Espèces">Espèces</SelectItem>
                  <SelectItem value="Virement">Virement</SelectItem>
                  <SelectItem value="Chèque">Chèque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notes supplémentaires..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-bm-primary hover:bg-bm-primary/90 text-stone-900"
          >
            {saving ? 'Enregistrement...' : purchase ? 'Mettre à jour' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
