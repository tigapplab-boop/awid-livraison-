'use client'

// ========================================
// AWID / BURGER MINUTE - Promo Management Page
// Gestion des bannières promo et descriptions produits
// ========================================

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Megaphone, 
  Tag, 
  Save, 
  AlertCircle, 
  CheckCircle2,
  Palette,
  FileText,
  Image as ImageIcon,
  Upload,
  Trash2
} from 'lucide-react'

interface PromoConfig {
  enabled: boolean
  text: string
  textAr: string
  bgColor: string
}

interface CoverConfig {
  coverImage: string | null
  enabled: boolean
}

interface Product {
  id: string
  name: string
  nameAr: string | null
  description: string | null
  descriptionAr: string | null
  price: number
  hasPromo: boolean
  promoText: string | null
  promoTextAr: string | null
  promoBgColor: string | null
  category: {
    id: string
    name: string
    nameAr: string | null
  }
}

export default function PromoManagementPage() {
  const [mainPromo, setMainPromo] = useState<PromoConfig>({
    enabled: false,
    text: '',
    textAr: '',
    bgColor: '#FF6B00',
  })
  const [coverImage, setCoverImage] = useState<CoverConfig>({
    coverImage: null,
    enabled: false,
  })
  const [uploadingCover, setUploadingCover] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const token = typeof window !== 'undefined' ? localStorage.getItem('bm_token') : null

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [promoRes, productsRes] = await Promise.all([
        fetch('/api/settings/promo'),
        fetch('/api/products'),
      ])

      if (promoRes.ok) {
        const promoData = await promoRes.json()
        setMainPromo(promoData)
      }

      // Fetch cover separately with better error handling
      try {
        const coverRes = await fetch('/api/settings/cover')
        if (coverRes.ok) {
          const coverData = await coverRes.json()
          setCoverImage(coverData)
        } else {
          console.log('Cover API not OK, status:', coverRes.status)
          setCoverImage({ coverImage: null, enabled: false })
        }
      } catch (coverErr) {
        console.error('Cover API error:', coverErr)
        setCoverImage({ coverImage: null, enabled: false })
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json()
        // Flatten products from categories
        const allProducts: Product[] = []
        productsData.forEach((cat: any) => {
          cat.products.forEach((prod: any) => {
            allProducts.push({
              ...prod,
              category: {
                id: cat.id,
                name: cat.name,
                nameAr: cat.nameAr,
              },
            })
          })
        })
        setProducts(allProducts)
      }
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const handleSaveMainPromo = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/promo', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(mainPromo),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }

      showMessage('success', 'Bannière principale mise à jour ✓')
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveProductPromo = async (product: Product, updates: Partial<Product>) => {
    try {
      const res = await fetch(`/api/products/${product.id}/promo`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }

      const updated = await res.json()
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, ...updated } : p))
      showMessage('success', `Promo de "${product.name}" mise à jour ✓`)
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Erreur')
    }
  }

  const handleSaveProductDescription = async (product: Product, description: string, descriptionAr: string) => {
    try {
      const res = await fetch(`/api/products/${product.id}/description`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ description, descriptionAr }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }

      const updated = await res.json()
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, ...updated } : p))
      setSelectedProduct(prev => prev?.id === product.id ? { ...prev, ...updated } : prev)
      showMessage('success', `Description de "${product.name}" mise à jour ✓`)
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Erreur')
    }
  }

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingCover(true)
    try {
      const formData = new FormData()
      formData.append('image', file)

      const res = await fetch('/api/settings/cover', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur d\'upload')
      }

      const data = await res.json()
      setCoverImage(data)
      showMessage('success', 'Photo de couverture uploadée ✓')
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Erreur')
    } finally {
      setUploadingCover(false)
    }
  }

  const handleToggleCover = async (enabled: boolean) => {
    try {
      const res = await fetch('/api/settings/cover', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }

      const data = await res.json()
      setCoverImage(data)
      showMessage('success', enabled ? 'Couverture activée ✓' : 'Couverture désactivée ✓')
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Erreur')
    }
  }

  const handleDeleteCover = async () => {
    if (!confirm('Supprimer la photo de couverture ?')) return

    try {
      const res = await fetch('/api/settings/cover', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }

      setCoverImage({ coverImage: null, enabled: false })
      showMessage('success', 'Couverture supprimée ✓')
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Erreur')
    }
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-6">
        <div className="h-10 bg-stone-200 rounded-lg animate-pulse w-64 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-stone-100 rounded-xl animate-pulse" />
          <div className="h-96 bg-stone-100 rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-stone-900 flex items-center gap-3">
          <Megaphone className="h-7 w-7 text-bm-primary" />
          Gestion des Promos
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Bannière principale, promos produits et descriptions
        </p>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      <Tabs defaultValue="cover" className="w-full">
        <TabsList className="mb-6 h-12">
          <TabsTrigger value="cover" className="gap-2 min-h-[44px]">
            <ImageIcon className="h-4 w-4" />
            Photo de Couverture
          </TabsTrigger>
          <TabsTrigger value="main" className="gap-2 min-h-[44px]">
            <Megaphone className="h-4 w-4" />
            Bannière Principale
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-2 min-h-[44px]">
            <Tag className="h-4 w-4" />
            Promos Produits
          </TabsTrigger>
          <TabsTrigger value="descriptions" className="gap-2 min-h-[44px]">
            <FileText className="h-4 w-4" />
            Descriptions
          </TabsTrigger>
        </TabsList>

        {/* Cover Image Tab */}
        <TabsContent value="cover">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Photo de Couverture du Menu</CardTitle>
              <p className="text-sm text-stone-500">
                S'affiche en haut de la page menu client (recommandé: 1200x400px)
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">Afficher la couverture</Label>
                  <p className="text-sm text-stone-500">Visible sur le menu client</p>
                </div>
                <Switch
                  checked={coverImage.enabled}
                  onCheckedChange={handleToggleCover}
                  disabled={!coverImage.coverImage}
                />
              </div>

              {/* Current Cover */}
              {coverImage.coverImage && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Photo actuelle</Label>
                  <div className="relative rounded-xl overflow-hidden border-2 border-stone-200">
                    <img
                      src={coverImage.coverImage}
                      alt="Couverture"
                      className="w-full h-48 object-cover"
                    />
                    <button
                      onClick={handleDeleteCover}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px]"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Upload New */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">
                  {coverImage.coverImage ? 'Changer la photo' : 'Ajouter une photo'}
                </Label>
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-stone-300 rounded-xl cursor-pointer hover:border-bm-primary hover:bg-stone-50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="h-10 w-10 text-stone-400 mb-3" />
                    <p className="text-sm font-medium text-stone-700">
                      {uploadingCover ? 'Upload en cours...' : 'Cliquez pour uploader'}
                    </p>
                    <p className="text-xs text-stone-500 mt-1">PNG, JPG, WEBP (max 5MB)</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleUploadCover}
                    disabled={uploadingCover}
                  />
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Main Banner Tab */}
        <TabsContent value="main">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Bannière Promo Principale</CardTitle>
              <p className="text-sm text-stone-500">
                S'affiche en haut du menu client
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">Activer la bannière</Label>
                  <p className="text-sm text-stone-500">Afficher sur le menu client</p>
                </div>
                <Switch
                  checked={mainPromo.enabled}
                  onCheckedChange={(checked) => setMainPromo(prev => ({ ...prev, enabled: checked }))}
                />
              </div>

              <div>
                <Label>Texte de la bannière (Français)</Label>
                <Input
                  value={mainPromo.text}
                  onChange={(e) => setMainPromo(prev => ({ ...prev, text: e.target.value }))}
                  placeholder="🔥 Offre spéciale du jour !"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label>Texte de la bannière (Arabe)</Label>
                <Input
                  value={mainPromo.textAr}
                  onChange={(e) => setMainPromo(prev => ({ ...prev, textAr: e.target.value }))}
                  placeholder="🔥 عرض خاص اليوم!"
                  className="mt-1.5"
                  dir="rtl"
                />
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Couleur de fond
                </Label>
                <div className="flex items-center gap-3 mt-1.5">
                  <Input
                    type="color"
                    value={mainPromo.bgColor}
                    onChange={(e) => setMainPromo(prev => ({ ...prev, bgColor: e.target.value }))}
                    className="w-20 h-12 p-1"
                  />
                  <Input
                    type="text"
                    value={mainPromo.bgColor}
                    onChange={(e) => setMainPromo(prev => ({ ...prev, bgColor: e.target.value }))}
                    placeholder="#FF6B00"
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Preview */}
              {mainPromo.enabled && (
                <div className="border-2 border-dashed border-stone-300 rounded-xl p-4">
                  <Label className="text-xs text-stone-500 mb-2 block">Aperçu</Label>
                  <div
                    className="w-full rounded-lg p-3 text-center font-bold text-white"
                    style={{ backgroundColor: mainPromo.bgColor }}
                  >
                    {mainPromo.text || 'Texte de la bannière'}
                  </div>
                </div>
              )}

              <Button
                onClick={handleSaveMainPromo}
                disabled={saving}
                className="w-full min-h-[48px] bg-bm-primary hover:bg-bm-primary-600 text-stone-900 font-bold"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Product Promos Tab */}
        <TabsContent value="products">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {products.map((product) => (
              <Card key={product.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{product.name}</CardTitle>
                      <p className="text-xs text-stone-500">{product.category.name}</p>
                    </div>
                    <Switch
                      checked={product.hasPromo}
                      onCheckedChange={(checked) => {
                        handleSaveProductPromo(product, {
                          hasPromo: checked,
                          promoText: checked ? product.promoText || '-20%' : null,
                          promoTextAr: checked ? product.promoTextAr || '-٢٠٪' : null,
                          promoBgColor: checked ? product.promoBgColor || '#FF6B00' : null,
                        })
                      }}
                    />
                  </div>
                </CardHeader>
                {product.hasPromo && (
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs">Texte promo (FR)</Label>
                      <Input
                        value={product.promoText || ''}
                        onChange={(e) => {
                          const newText = e.target.value
                          setProducts(prev => prev.map(p => 
                            p.id === product.id ? { ...p, promoText: newText } : p
                          ))
                        }}
                        onBlur={() => {
                          handleSaveProductPromo(product, {
                            hasPromo: true,
                            promoText: product.promoText,
                            promoTextAr: product.promoTextAr,
                            promoBgColor: product.promoBgColor,
                          })
                        }}
                        placeholder="-20%"
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Texte promo (AR)</Label>
                      <Input
                        value={product.promoTextAr || ''}
                        onChange={(e) => {
                          const newText = e.target.value
                          setProducts(prev => prev.map(p => 
                            p.id === product.id ? { ...p, promoTextAr: newText } : p
                          ))
                        }}
                        onBlur={() => {
                          handleSaveProductPromo(product, {
                            hasPromo: true,
                            promoText: product.promoText,
                            promoTextAr: product.promoTextAr,
                            promoBgColor: product.promoBgColor,
                          })
                        }}
                        placeholder="-٢٠٪"
                        dir="rtl"
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs flex items-center gap-1">
                        <Palette className="h-3 w-3" />
                        Couleur
                      </Label>
                      <Input
                        type="color"
                        value={product.promoBgColor || '#FF6B00'}
                        onChange={(e) => {
                          const newColor = e.target.value
                          setProducts(prev => prev.map(p => 
                            p.id === product.id ? { ...p, promoBgColor: newColor } : p
                          ))
                        }}
                        onBlur={() => {
                          handleSaveProductPromo(product, {
                            hasPromo: true,
                            promoText: product.promoText,
                            promoTextAr: product.promoTextAr,
                            promoBgColor: product.promoBgColor,
                          })
                        }}
                        className="mt-1 h-9 w-full"
                      />
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Descriptions Tab */}
        <TabsContent value="descriptions">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Product List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">Produits</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <div className="px-4 pb-4 space-y-2">
                    {products.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => setSelectedProduct(product)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                          selectedProduct?.id === product.id
                            ? 'border-bm-primary bg-bm-primary-50'
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <p className="font-semibold text-sm text-stone-900">{product.name}</p>
                        <p className="text-xs text-stone-500">{product.category.name}</p>
                        {product.description && (
                          <Badge variant="outline" className="mt-1 text-[10px]">
                            A une description
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Description Editor */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">
                  {selectedProduct ? selectedProduct.name : 'Sélectionnez un produit'}
                </CardTitle>
                {selectedProduct && (
                  <p className="text-sm text-stone-500">{selectedProduct.category.name}</p>
                )}
              </CardHeader>
              <CardContent>
                {selectedProduct ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Description (Français)</Label>
                      <Textarea
                        value={selectedProduct.description || ''}
                        onChange={(e) => {
                          const newDesc = e.target.value
                          setSelectedProduct(prev => prev ? { ...prev, description: newDesc } : null)
                        }}
                        placeholder="Description du produit..."
                        rows={4}
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label>Description (Arabe)</Label>
                      <Textarea
                        value={selectedProduct.descriptionAr || ''}
                        onChange={(e) => {
                          const newDesc = e.target.value
                          setSelectedProduct(prev => prev ? { ...prev, descriptionAr: newDesc } : null)
                        }}
                        placeholder="وصف المنتج..."
                        rows={4}
                        dir="rtl"
                        className="mt-1.5"
                      />
                    </div>

                    <Button
                      onClick={() => {
                        if (selectedProduct) {
                          handleSaveProductDescription(
                            selectedProduct,
                            selectedProduct.description || '',
                            selectedProduct.descriptionAr || ''
                          )
                        }
                      }}
                      className="w-full min-h-[48px] bg-bm-primary hover:bg-bm-primary-600 text-stone-900 font-bold"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Sauvegarder la description
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-12 text-stone-400">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Sélectionnez un produit pour éditer sa description</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
