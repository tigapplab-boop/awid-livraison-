'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, TrendingUp, AlertCircle } from 'lucide-react'
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
import ProductForm from './ProductForm'
import { formatPrice, calculateProfit, getStockStatus, getStockBadgeColor } from '@/lib/inventory/calculations'

interface InventoryProduct {
  id: string
  name: string
  nameAr: string | null
  supplier: string
  category: string
  unit: string
  purchasePrice: number
  sellingPrice: number
  currentStock: number
  minStock: number
  linkedProduct: any
}

export default function ProductsTab() {
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/inventory/products')
      const data = await res.json()
      setProducts(data)
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingProduct(null)
    setDialogOpen(true)
  }

  const handleEdit = (product: InventoryProduct) => {
    setEditingProduct(product)
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce produit ?')) return

    try {
      const res = await fetch(`/api/inventory/products/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const error = await res.json()
        alert(error.error || 'Erreur lors de la suppression')
        return
      }
      fetchProducts()
    } catch (error) {
      console.error('Failed to delete product:', error)
      alert('Erreur lors de la suppression')
    }
  }

  const handleSaved = () => {
    setDialogOpen(false)
    fetchProducts()
  }

  if (loading) {
    return <div className="animate-pulse p-8">Chargement...</div>
  }

  return (
    <div>
      {/* Actions */}
      <div className="mb-4 flex justify-end">
        <Button
          onClick={handleCreate}
          className="bg-bm-primary hover:bg-bm-primary/90 text-stone-900 font-bold"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un produit
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Fournisseur</TableHead>
              <TableHead className="text-right">Prix Achat</TableHead>
              <TableHead className="text-right">Prix Vente</TableHead>
              <TableHead className="text-right">Bénéfice</TableHead>
              <TableHead className="text-right">Marge %</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-stone-500">
                  Aucun produit. Cliquez sur "Ajouter un produit" pour commencer.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const { profit, profitMargin } = calculateProfit(
                  product.purchasePrice,
                  product.sellingPrice,
                  product.currentStock
                )
                const stockStatus = getStockStatus(product.currentStock, product.minStock)

                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        {product.nameAr && (
                          <div className="text-xs text-stone-500" dir="rtl">
                            {product.nameAr}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.category}</Badge>
                    </TableCell>
                    <TableCell className="text-stone-600">{product.supplier}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatPrice(product.purchasePrice)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatPrice(product.sellingPrice)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      <span className={profit > 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatPrice(profit)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      <span
                        className={
                          profitMargin >= 30
                            ? 'text-emerald-600 font-bold'
                            : profitMargin >= 15
                            ? 'text-green-600'
                            : profitMargin >= 5
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }
                      >
                        {profitMargin.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className={getStockBadgeColor(stockStatus)}>
                        {stockStatus === 'OUT' && <AlertCircle className="h-3 w-3 mr-1" />}
                        {product.currentStock} {product.unit}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(product)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog */}
      <ProductForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editingProduct}
        onSaved={handleSaved}
      />
    </div>
  )
}
