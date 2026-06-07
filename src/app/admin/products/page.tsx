'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Plus, Pencil, Trash2, Package, ChevronDown, ChevronUp, ImageIcon, Upload, X } from 'lucide-react'
import type { CategoryWithProducts } from '@/bm/types'
import { formatDA } from '@/bm/lib/format'

interface ProductFull {
  id: string
  name: string
  nameAr: string | null
  description: string | null
  price: number
  image: string | null
  isAvailable: boolean
  categoryId: string
}

export default function ProductsPage() {
  const [categories, setCategories] = useState<CategoryWithProducts[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [productDialog, setProductDialog] = useState(false)
  const [categoryDialog, setCategoryDialog] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'product' | 'category'; id: string; name: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Product form
  const [editingProduct, setEditingProduct] = useState<ProductFull | null>(null)
  const [pName, setPName] = useState('')
  const [pNameAr, setPNameAr] = useState('')
  const [pDesc, setPDesc] = useState('')
  const [pPrice, setPPrice] = useState('')
  const [pImage, setPImage] = useState('')
  const [pCategory, setPCategory] = useState('')
  const [pAvailable, setPAvailable] = useState(true)
  const [uploading, setUploading] = useState(false)

  // Category form
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [cName, setCName] = useState('')
  const [cNameAr, setCNameAr] = useState('')

  const token = typeof window !== 'undefined' ? localStorage.getItem('bm_token') : null

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
        if (expandedCategories.size === 0 && data.length > 0) {
          setExpandedCategories(new Set(data.map((c: CategoryWithProducts) => c.id)))
        }
      }
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [token, expandedCategories.size])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openNewProduct = (categoryId?: string) => {
    setEditingProduct(null)
    setPName('')
    setPNameAr('')
    setPDesc('')
    setPPrice('')
    setPImage('')
    setPCategory(categoryId || (categories[0]?.id ?? ''))
    setPAvailable(true)
    setProductDialog(true)
  }

  const openEditProduct = (product: ProductFull) => {
    setEditingProduct(product)
    setPName(product.name)
    setPNameAr(product.nameAr || '')
    setPDesc(product.description || '')
    setPPrice((product.price / 100).toString())
    setPImage(product.image || '')
    setPCategory(product.categoryId)
    setPAvailable(product.isAvailable)
    setProductDialog(true)
  }

  const saveProduct = async () => {
    if (!pName || !pPrice || !pCategory) {
      setMessage({ type: 'error', text: 'Nom, prix et catégorie requis' })
      return
    }

    const priceCents = Math.round(parseFloat(pPrice) * 100)
    if (isNaN(priceCents) || priceCents <= 0) {
      setMessage({ type: 'error', text: 'Prix invalide' })
      return
    }

    setSaving(true)
    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products'
      const method = editingProduct ? 'PATCH' : 'POST'
      const body = {
        name: pName,
        nameAr: pNameAr || null,
        description: pDesc || null,
        price: priceCents,
        image: pImage || null,
        isAvailable: pAvailable,
        categoryId: pCategory,
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }

      setMessage({ type: 'success', text: editingProduct ? 'Produit mis à jour' : 'Produit créé' })
      setProductDialog(false)
      fetchCategories()
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur' })
    } finally {
      setSaving(false)
    }
  }

  const toggleProductAvailability = async (product: ProductFull) => {
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isAvailable: !product.isAvailable }),
      })
      if (res.ok) fetchCategories()
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour' })
    }
  }

  const openNewCategory = () => {
    setEditingCategory(null)
    setCName('')
    setCNameAr('')
    setCategoryDialog(true)
  }

  const openEditCategory = (cat: CategoryWithProducts) => {
    setEditingCategory(cat.id)
    setCName(cat.name)
    setCNameAr(cat.nameAr || '')
    setCategoryDialog(true)
  }

  const saveCategory = async () => {
    if (!cName) {
      setMessage({ type: 'error', text: 'Nom de catégorie requis' })
      return
    }

    setSaving(true)
    try {
      const url = editingCategory ? `/api/categories/${editingCategory}` : '/api/categories'
      const method = editingCategory ? 'PATCH' : 'POST'
      const body = { name: cName, nameAr: cNameAr || null }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }

      setMessage({ type: 'success', text: editingCategory ? 'Catégorie mise à jour' : 'Catégorie créée' })
      setCategoryDialog(false)
      fetchCategories()
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur' })
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      const url = deleteTarget.type === 'product'
        ? `/api/products/${deleteTarget.id}`
        : `/api/categories/${deleteTarget.id}`
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }
      setMessage({ type: 'success', text: 'Supprimé avec succès' })
      setDeleteDialog(false)
      setDeleteTarget(null)
      fetchCategories()
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 bg-stone-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-stone-900">Produits & Catégories</h1>
        <div className="flex gap-2">
          <Button onClick={openNewCategory} variant="outline" className="min-h-[48px] border-bm-primary text-bm-primary">
            <Plus className="h-4 w-4 mr-2" /> Catégorie
          </Button>
          <Button onClick={() => openNewProduct()} className="min-h-[48px] bg-bm-primary hover:bg-bm-primary-600 text-stone-900">
            <Plus className="h-4 w-4 mr-2" /> Produit
          </Button>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
          message.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-2 opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      <ScrollArea className="max-h-[calc(100vh-200px)]">
        <div className="space-y-4 pr-2">
          {categories.map((cat) => {
            const isExpanded = expandedCategories.has(cat.id)
            return (
              <Card key={cat.id} className="border shadow-sm">
                <CardHeader className="py-3 px-4 cursor-pointer" onClick={() => toggleCategory(cat.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-bm-primary" />
                      <CardTitle className="text-base font-bold">{cat.name}</CardTitle>
                      {cat.nameAr && <span className="text-sm text-stone-400">({cat.nameAr})</span>}
                      <Badge variant="outline" className="text-xs">{cat.products?.length || 0} produits</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); openEditCategory(cat) }}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'category', id: cat.id, name: cat.name }); setDeleteDialog(true) }}
                        className="h-8 w-8 p-0 text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {isExpanded ? <ChevronUp className="h-5 w-5 text-stone-400" /> : <ChevronDown className="h-5 w-5 text-stone-400" />}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 pb-4 px-4">
                    <Separator className="mb-3" />
                    <div className="space-y-2">
                      {(cat.products || []).map((product) => (
                        <div key={product.id} className="flex items-center gap-3 p-3 rounded-lg bg-stone-50 hover:bg-stone-100 transition-colors">
                          {/* Product thumbnail */}
                          {product.image ? (
                            <img src={product.image} alt={product.name} className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-stone-200 flex items-center justify-center flex-shrink-0">
                              <ImageIcon className="h-5 w-5 text-stone-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-stone-800">{product.name}</span>
                              {product.nameAr && <span className="text-xs text-stone-400">({product.nameAr})</span>}
                              <Badge className={product.isAvailable ? 'bg-emerald-100 text-emerald-700 border-0' : 'bg-red-100 text-red-700 border-0'}>
                                {product.isAvailable ? 'Disponible' : 'Indisponible'}
                              </Badge>
                            </div>
                            <div className="text-sm text-stone-500 mt-0.5">
                              {formatDA(product.price)} {product.description && `• ${product.description}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={product.isAvailable}
                              onCheckedChange={() => toggleProductAvailability(product)}
                            />
                            <Button variant="ghost" size="sm" onClick={() => openEditProduct(product)} className="h-8 w-8 p-0">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setDeleteTarget({ type: 'product', id: product.id, name: product.name }); setDeleteDialog(true) }}
                              className="h-8 w-8 p-0 text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {(cat.products || []).length === 0 && (
                        <p className="text-sm text-stone-400 text-center py-4">Aucun produit dans cette catégorie</p>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => openNewProduct(cat.id)}
                        className="w-full min-h-[44px] border-dashed text-stone-500 hover:text-bm-primary hover:border-bm-primary"
                      >
                        <Plus className="h-4 w-4 mr-2" /> Ajouter un produit
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}

          {categories.length === 0 && (
            <div className="text-center py-12 text-stone-400">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Aucune catégorie</p>
              <p className="text-sm mt-1">Commencez par créer une catégorie</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Product Dialog */}
      <Dialog open={productDialog} onOpenChange={setProductDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Modifier le produit' : 'Nouveau produit'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nom *</Label>
              <Input value={pName} onChange={(e) => setPName(e.target.value)} className="input-bm mt-1" placeholder="Nom du produit" />
            </div>
            <div>
              <Label>Nom (Arabe)</Label>
              <Input value={pNameAr} onChange={(e) => setPNameAr(e.target.value)} className="input-bm mt-1" placeholder="الاسم بالعربية" dir="rtl" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={pDesc} onChange={(e) => setPDesc(e.target.value)} className="input-bm mt-1" placeholder="Description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prix (DA) *</Label>
                <Input value={pPrice} onChange={(e) => setPPrice(e.target.value)} className="input-bm mt-1" placeholder="450" type="number" />
              </div>
              <div>
                <Label>Catégorie *</Label>
                <Select value={pCategory} onValueChange={setPCategory}>
                  <SelectTrigger className="input-bm mt-1">
                    <SelectValue placeholder="Catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Image du produit</Label>
              {/* Image preview */}
              {pImage && (
                <div className="relative mt-2 mb-2 inline-block">
                  <img
                    src={pImage}
                    alt="Aperçu"
                    className="h-32 w-32 rounded-xl object-cover border border-stone-200 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setPImage('')}
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {/* Upload button */}
              <div className="flex items-center gap-2 mt-1">
                <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-stone-300 cursor-pointer hover:border-bm-primary hover:bg-bm-primary-50 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Upload className="h-4 w-4 text-stone-500" />
                  <span className="text-sm font-medium text-stone-600">
                    {uploading ? 'Upload en cours...' : 'Choisir une image'}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setUploading(true)
                      try {
                        const formData = new FormData()
                        formData.append('file', file)
                        const res = await fetch('/api/upload', {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${token}` },
                          body: formData,
                        })
                        if (!res.ok) {
                          const data = await res.json()
                          throw new Error(data.error || 'Upload échoué')
                        }
                        const data = await res.json()
                        setPImage(data.url)
                        setMessage({ type: 'success', text: 'Image uploadée avec succès' })
                      } catch (err) {
                        setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur upload' })
                      } finally {
                        setUploading(false)
                        e.target.value = ''
                      }
                    }}
                    disabled={uploading}
                  />
                </label>
              </div>
              <p className="text-xs text-stone-400 mt-1.5">JPEG, PNG, WebP ou GIF. Max 5 MB.</p>
              {/* Manual URL fallback */}
              <details className="mt-2">
                <summary className="text-xs text-stone-400 cursor-pointer hover:text-stone-600">Ou entrer une URL manuellement</summary>
                <Input value={pImage} onChange={(e) => setPImage(e.target.value)} className="input-bm mt-1" placeholder="https://..." />
              </details>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={pAvailable} onCheckedChange={setPAvailable} />
              <Label>Disponible</Label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setProductDialog(false)} className="min-h-[48px]">Annuler</Button>
            <Button onClick={saveProduct} disabled={saving} className="min-h-[48px] bg-bm-primary hover:bg-bm-primary-600 text-stone-900">
              {saving ? 'Enregistrement...' : editingProduct ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={categoryDialog} onOpenChange={setCategoryDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nom *</Label>
              <Input value={cName} onChange={(e) => setCName(e.target.value)} className="input-bm mt-1" placeholder="Nom de la catégorie" />
            </div>
            <div>
              <Label>Nom (Arabe)</Label>
              <Input value={cNameAr} onChange={(e) => setCNameAr(e.target.value)} className="input-bm mt-1" placeholder="الاسم بالعربية" dir="rtl" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCategoryDialog(false)} className="min-h-[48px]">Annuler</Button>
            <Button onClick={saveCategory} disabled={saving} className="min-h-[48px] bg-bm-primary hover:bg-bm-primary-600 text-stone-900">
              {saving ? 'Enregistrement...' : editingCategory ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p className="text-stone-600">
            Êtes-vous sûr de vouloir supprimer <strong>{deleteTarget?.name}</strong> ?
            {deleteTarget?.type === 'category' && ' Tous les produits de cette catégorie seront aussi supprimés.'}
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialog(false)} className="min-h-[48px]">Annuler</Button>
            <Button onClick={confirmDelete} disabled={saving} className="min-h-[48px] bg-red-600 hover:bg-red-700 text-white">
              {saving ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
