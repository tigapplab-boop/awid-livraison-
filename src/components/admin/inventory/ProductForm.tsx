'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

interface ProductFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: any | null
  onSaved: () => void
}

const CATEGORIES = ['Boissons', 'Viandes', 'Pain', 'Légumes', 'Sauces', 'Emballages', 'Divers']
const UNITS = ['unité', 'kg', 'litre', 'carton', 'pièce', 'paquet']

export default function ProductForm({ open, onOpenChange, product, onSaved }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    supplier: '',
    category: 'Boissons',
    unit: 'unité',
    purchasePrice: '',
    sellingPrice: '',
    currentStock: '',
    minStock: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        nameAr: product.nameAr || '',
        supplier: product.supplier || '',
        category: product.category || 'Boissons',
        unit: product.unit || 'unité',
        purchasePrice: product.purchasePrice ? (product.purchasePrice / 100).toString() : '',
        sellingPrice: product.sellingPrice ? (product.sellingPrice / 100).toString() : '',
        currentStock: product.currentStock?.toString() || '0',
        minStock: product.minStock?.toString() || '0',
      })
    } else {
      setFormData({
        name: '',
        nameAr: '',
        supplier: '',
        category: 'Boissons',
        unit: 'unité',
        purchasePrice: '',
        sellingPrice: '',
        currentStock: '0',
        minStock: '10',
      })
    }
  }, [product])

  const handleSave = async () => {
    if (!formData.name || !formData.supplier || !formData.purchasePrice || !formData.sellingPrice) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    setSaving(true)

    try {
      const body = {
        name: formData.name,
        nameAr: formData.nameAr || null,
        supplier: formData.supplier,
        category: formData.category,
        unit: formData.unit,
        purchasePrice: Math.round(parseFloat(formData.purchasePrice) * 100),
        sellingPrice: Math.round(parseFloat(formData.sellingPrice) * 100),
        currentStock: parseFloat(formData.currentStock) || 0,
        minStock: parseFloat(formData.minStock) || 0,
      }

      const url = product
        ? `/api/inventory/products/${product.id}`
        : '/api/inventory/products'
      const method = product ? 'PATCH' : 'POST'
      const token = typeof window !== 'undefined' ? localStorage.getItem('bm_token') : null

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        throw new Error('Failed to save')
      }

      onSaved()
    } catch (error) {
      console.error('Failed to save product:', error)
      alert('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? 'Modifier le produit' : 'Ajouter un produit'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div>
            <Label htmlFor="name">Nom (Français) *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Coca Cola 1.5L"
            />
          </div>

          <div>
            <Label htmlFor="nameAr">Nom (Arabe)</Label>
            <Input
              id="nameAr"
              value={formData.nameAr}
              onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
              placeholder="Ex: كوكا كولا"
              dir="rtl"
            />
          </div>

          <div>
            <Label htmlFor="supplier">Fournisseur *</Label>
            <Input
              id="supplier"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              placeholder="Ex: Hamoud Boualem"
            />
          </div>

          <div>
            <Label htmlFor="category">Catégorie *</Label>
            <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="unit">Unité *</Label>
            <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="purchasePrice">Prix d'achat (DA) *</Label>
            <Input
              id="purchasePrice"
              type="number"
              step="0.01"
              value={formData.purchasePrice}
              onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
              placeholder="150.00"
            />
          </div>

          <div>
            <Label htmlFor="sellingPrice">Prix de vente (DA) *</Label>
            <Input
              id="sellingPrice"
              type="number"
              step="0.01"
              value={formData.sellingPrice}
              onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
              placeholder="200.00"
            />
          </div>

          <div>
            <Label htmlFor="currentStock">Stock actuel</Label>
            <Input
              id="currentStock"
              type="number"
              step="0.1"
              value={formData.currentStock}
              onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
              placeholder="0"
            />
          </div>

          <div>
            <Label htmlFor="minStock">Stock minimum (alerte)</Label>
            <Input
              id="minStock"
              type="number"
              step="0.1"
              value={formData.minStock}
              onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
              placeholder="10"
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
            {saving ? 'Enregistrement...' : product ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
