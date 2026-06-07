'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Minus, Plus, Trash2, ShoppingCart, Phone, Store, Send, AlertCircle } from 'lucide-react'
import type { CategoryWithProducts, DeliveryZone } from '@/bm/types'
import { formatDA } from '@/bm/lib/format'

interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
}

interface Livreur {
  id: string
  name: string
  phone: string | null
  isAvailable: boolean
}

export default function POSPage() {
  const [categories, setCategories] = useState<CategoryWithProducts[]>([])
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [livreurs, setLivreurs] = useState<Livreur[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [mode, setMode] = useState<'pos' | 'phone'>('pos')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Phone order form
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [selectedZone, setSelectedZone] = useState('')
  const [selectedLivreur, setSelectedLivreur] = useState('')
  const [orderNotes, setOrderNotes] = useState('')

  const token = typeof window !== 'undefined' ? localStorage.getItem('bm_token') : null

  const fetchData = useCallback(async () => {
    try {
      const [catRes, zoneRes, livRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/zones', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/livreurs', { headers: { Authorization: `Bearer ${token}` } }),
      ])

      if (catRes.ok) {
        const catData = await catRes.json()
        setCategories(catData)
        if (catData.length > 0 && !activeCategory) {
          setActiveCategory(catData[0].id)
        }
      }
      if (zoneRes.ok) setZones(await zoneRes.json())
      if (livRes.ok) setLivreurs(await livRes.json())
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [token, activeCategory])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const addToCart = (product: { id: string; name: string; price: number }) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id)
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1 }]
    })
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.productId === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))
        .filter((i) => i.quantity > 0)
    )
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId))
  }

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)

  const selectedZoneData = zones.find((z) => z.id === selectedZone)
  const deliveryFee = mode === 'phone' && selectedZoneData ? selectedZoneData.dayFee : 0
  const total = subtotal + deliveryFee

  const resetForm = () => {
    setCart([])
    setClientName('')
    setClientPhone('')
    setClientAddress('')
    setSelectedZone('')
    setSelectedLivreur('')
    setOrderNotes('')
  }

  const handleSubmitPhoneOrder = async () => {
    if (cart.length === 0) {
      setMessage({ type: 'error', text: 'Ajoutez au moins un produit' })
      return
    }
    if (!clientName.trim()) {
      setMessage({ type: 'error', text: 'Nom du client requis' })
      return
    }
    if (!clientPhone.match(/^0[5-7][0-9]{8}$/)) {
      setMessage({ type: 'error', text: 'Numéro de téléphone invalide (0XXXXXXXXX)' })
      return
    }
    if (!clientAddress.trim()) {
      setMessage({ type: 'error', text: 'Adresse du client requise' })
      return
    }
    if (!selectedZone) {
      setMessage({ type: 'error', text: 'Zone de livraison requise' })
      return
    }
    if (!selectedLivreur) {
      setMessage({ type: 'error', text: 'Livreur requis' })
      return
    }

    setSubmitting(true)
    setMessage(null)

    try {
      const res = await fetch('/api/orders/phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientPhone,
          clientAddress: clientAddress.trim(),
          deliveryZone: selectedZoneData?.name,
          livreurId: selectedLivreur,
          items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          notes: orderNotes.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la création')
      }

      setMessage({ type: 'success', text: `Commande ${data.orderNumber} créée avec succès!` })
      resetForm()
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitPOSOrder = async () => {
    if (cart.length === 0) {
      setMessage({ type: 'error', text: 'Ajoutez au moins un produit' })
      return
    }

    setSubmitting(true)
    setMessage(null)

    try {
      // For POS orders, we create a phone order with POS-like details
      // Using a default zone and no livreur
      const defaultZone = zones[0]
      const availableLivreur = livreurs.find((l) => l.isAvailable)

      const res = await fetch('/api/orders/pos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          notes: 'COMMANDE SUR PLACE - POS',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la création')
      }

      setMessage({ type: 'success', text: `Commande sur place ${data.orderNumber} créée!` })
      resetForm()
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-4">
        <div className="h-10 bg-stone-200 rounded-lg animate-pulse w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-96 bg-stone-100 rounded-xl animate-pulse" />
          <div className="h-96 bg-stone-100 rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-extrabold text-stone-900">Point de Vente</h1>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${
          message.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.type === 'error' && <AlertCircle className="h-4 w-4" />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto text-current opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Product Grid */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'pos' | 'phone')} className="mb-3">
            <TabsList className="h-12">
              <TabsTrigger value="pos" className="min-h-[44px] px-4 gap-2">
                <Store className="h-4 w-4" /> Sur Place
              </TabsTrigger>
              <TabsTrigger value="phone" className="min-h-[44px] px-4 gap-2">
                <Phone className="h-4 w-4" /> Téléphone
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Category Tabs */}
          <div className="category-tabs mb-3 -mx-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`category-tab ${activeCategory === cat.id ? 'category-tab-active' : 'category-tab-inactive'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pr-2">
              {categories
                .find((c) => c.id === activeCategory)
                ?.products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border-2 border-stone-100 hover:border-bm-primary hover:shadow-md transition-all min-h-[100px] active:scale-95"
                  >
                    <span className="font-bold text-stone-800 text-sm text-center leading-tight">{product.name}</span>
                    <span className="text-bm-primary font-extrabold text-lg mt-2">{formatDA(product.price)}</span>
                  </button>
                ))}
            </div>
          </ScrollArea>
        </div>

        {/* Cart Sidebar */}
        <div className="flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col border-2 border-bm-primary-200 shadow-lg">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingCart className="h-5 w-5 text-bm-primary" />
                Panier
                {cart.length > 0 && (
                  <Badge className="bg-bm-primary text-stone-900 ml-auto">{cart.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
              <ScrollArea className="flex-1 px-4 py-3">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-stone-400 text-sm">
                    Panier vide
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div key={item.productId} className="flex items-center gap-2 bg-stone-50 rounded-lg p-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-800 truncate">{item.name}</p>
                          <p className="text-xs text-stone-500">{formatDA(item.price)} × {item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(item.productId, -1)}
                            className="qty-btn h-8 w-8 text-sm"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, 1)}
                            className="qty-btn h-8 w-8 text-sm"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="font-bold text-sm text-stone-800 w-16 text-right">
                          {formatDA(item.price * item.quantity)}
                        </span>
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Phone Order Form */}
              {mode === 'phone' && (
                <div className="border-t border-stone-200 px-4 py-3 space-y-3 bg-bm-primary-50/50">
                  <div>
                    <Label className="text-xs font-medium text-stone-600">Nom du client *</Label>
                    <Input
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="input-bm mt-1 h-10 text-sm"
                      placeholder="Nom complet"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-stone-600">Téléphone *</Label>
                    <Input
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="input-bm mt-1 h-10 text-sm"
                      placeholder="0X XX XX XX XX"
                      type="tel"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-stone-600">Adresse *</Label>
                    <Input
                      value={clientAddress}
                      onChange={(e) => setClientAddress(e.target.value)}
                      className="input-bm mt-1 h-10 text-sm"
                      placeholder="Adresse de livraison"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs font-medium text-stone-600">Zone *</Label>
                      <Select value={selectedZone} onValueChange={setSelectedZone}>
                        <SelectTrigger className="h-10 text-sm mt-1">
                          <SelectValue placeholder="Zone" />
                        </SelectTrigger>
                        <SelectContent>
                          {zones.map((z) => (
                            <SelectItem key={z.id} value={z.id}>
                              {z.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-stone-600">Livreur *</Label>
                      <Select value={selectedLivreur} onValueChange={setSelectedLivreur}>
                        <SelectTrigger className="h-10 text-sm mt-1">
                          <SelectValue placeholder="Livreur" />
                        </SelectTrigger>
                        <SelectContent>
                          {livreurs.map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              {l.name} {l.isAvailable ? '✅' : '❌'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-stone-600">Notes</Label>
                    <Input
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      className="input-bm mt-1 h-10 text-sm"
                      placeholder="Notes (optionnel)"
                    />
                  </div>
                </div>
              )}

              {/* Totals & Submit */}
              <div className="border-t border-stone-200 px-4 py-3 bg-white">
                <div className="space-y-1 text-sm mb-3">
                  <div className="flex justify-between text-stone-600">
                    <span>Sous-total</span>
                    <span>{formatDA(subtotal)}</span>
                  </div>
                  {mode === 'phone' && deliveryFee > 0 && (
                    <div className="flex justify-between text-stone-600">
                      <span>Livraison</span>
                      <span>{formatDA(deliveryFee)}</span>
                    </div>
                  )}
                  <Separator className="my-1" />
                  <div className="flex justify-between font-extrabold text-lg text-stone-900">
                    <span>Total</span>
                    <span>{formatDA(total)}</span>
                  </div>
                </div>

                {mode === 'phone' ? (
                  <Button
                    onClick={handleSubmitPhoneOrder}
                    disabled={submitting || cart.length === 0}
                    className="w-full min-h-[56px] bg-bm-primary hover:bg-bm-primary-600 text-stone-900 font-bold text-base"
                  >
                    <Send className="h-5 w-5 mr-2" />
                    {submitting ? 'Création...' : 'Créer Commande Téléphone'}
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmitPOSOrder}
                    disabled={submitting || cart.length === 0}
                    className="w-full min-h-[56px] bg-bm-secondary hover:bg-bm-secondary-500/90 text-white font-bold text-base"
                  >
                    <Store className="h-5 w-5 mr-2" />
                    {submitting ? 'Création...' : 'Vente Sur Place'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
