'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Minus, Plus, Trash2, ShoppingCart, Phone, Store, Send, AlertCircle, Printer } from 'lucide-react'
import type { CategoryWithProducts, DeliveryZone, Product } from '@/bm/types'
import { formatDA } from '@/bm/lib/format'
import KitchenTicket from '@/components/pos/KitchenTicket'
import { usePrint } from '@/hooks/use-print'
import SupplementPicker from '@/components/SupplementPicker'
import SaucePicker from '@/components/menu/SaucePicker'

interface CartItem {
  product: Product
  quantity: number
  attachedToProductId?: string
}

// Category names detection
const SUPPLEMENT_CATEGORY_NAMES = ['Suppléments', 'Supplements', 'suppléments', 'supplements']
const SAUCE_CATEGORY_NAMES = ['Sauces', 'sauces', 'Sauce', 'sauce', 'صلصة', 'صلصات']

function isSupplement(product: Product, categories: CategoryWithProducts[]): boolean {
  const category = categories.find(c => c.id === product.categoryId)
  return category ? SUPPLEMENT_CATEGORY_NAMES.includes(category.name) : false
}

function isSauce(product: Product, categories: CategoryWithProducts[]): boolean {
  const category = categories.find(c => c.id === product.categoryId)
  return category ? SAUCE_CATEGORY_NAMES.includes(category.name) : false
}

function isBurger(product: Product, categories: CategoryWithProducts[]): boolean {
  const category = categories.find(c => c.id === product.categoryId)
  return category ? (
    category.name.toLowerCase().includes('burger') ||
    category.name.toLowerCase().includes('sandwich')
  ) : false
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
  const [lastPOSOrder, setLastPOSOrder] = useState<any>(null)

  // Supplement/Sauce picker state
  const [supplementPickerOpen, setSupplementPickerOpen] = useState(false)
  const [pendingSupplement, setPendingSupplement] = useState<Product | null>(null)
  const [saucePickerOpen, setSaucePickerOpen] = useState(false)
  const [pendingSauce, setPendingSauce] = useState<{ id: string; name: string; nameAr: string | null } | null>(null)

  // Printing
  const ticketRef = useRef<HTMLDivElement>(null)
  const { print } = usePrint(ticketRef)

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

  const addToCart = (product: Product) => {
    // Check if product is a supplement
    const isSup = isSupplement(product, categories)
    if (isSup) {
      handleAddSupplement(product)
      return
    }

    // Check if product is a sauce
    const isSau = isSauce(product, categories)
    if (isSau) {
      handleAddSauce({ id: product.id, name: product.name, nameAr: product.nameAr })
      return
    }

    // Regular product (burger, etc.) - add directly
    setCart((prev) => [...prev, { product, quantity: 1 }])
  }

  const handleAddSupplement = (product: Product) => {
    const burgersInCart = cart.filter((item) => !item.attachedToProductId)
    if (burgersInCart.length === 0) {
      // No burgers, add standalone
      setCart((prev) => [...prev, { product, quantity: 1 }])
      return
    }
    if (burgersInCart.length === 1) {
      // Only one burger, attach automatically
      setCart((prev) => [...prev, { product, quantity: 1, attachedToProductId: burgersInCart[0].product.id }])
      return
    }
    // Multiple burgers, show picker
    setPendingSupplement(product)
    setSupplementPickerOpen(true)
  }

  const handleAddSauce = (sauce: { id: string; name: string; nameAr: string | null }) => {
    const burgersInCart = cart.filter((item) => {
      return isBurger(item.product, categories)
    })

    if (burgersInCart.length === 0) {
      // No burgers, add standalone
      const product = categories.flatMap(c => c.products).find(p => p.id === sauce.id)
      if (product) {
        setCart((prev) => [...prev, { product, quantity: 1 }])
      }
      return
    }

    if (burgersInCart.length === 1) {
      // Only one burger, attach automatically
      const product = categories.flatMap(c => c.products).find(p => p.id === sauce.id)
      if (product) {
        setCart((prev) => [...prev, { product, quantity: 1, attachedToProductId: burgersInCart[0].product.id }])
      }
      return
    }

    // Multiple burgers, show picker
    setPendingSauce(sauce)
    setSaucePickerOpen(true)
  }

  const handleSupplementSelect = (attachedToProductId: string) => {
    if (pendingSupplement) {
      setCart((prev) => [...prev, { product: pendingSupplement, quantity: 1, attachedToProductId }])
    }
    setPendingSupplement(null)
  }

  const handleSupplementSkip = () => {
    if (pendingSupplement) {
      setCart((prev) => [...prev, { product: pendingSupplement, quantity: 1 }])
    }
    setPendingSupplement(null)
  }

  const handleSauceSelect = (attachedToProductId: string) => {
    if (pendingSauce) {
      const product = categories.flatMap(c => c.products).find(p => p.id === pendingSauce.id)
      if (product) {
        setCart((prev) => [...prev, { product, quantity: 1, attachedToProductId }])
      }
    }
    setPendingSauce(null)
  }

  const handleSauceSkip = () => {
    if (pendingSauce) {
      const product = categories.flatMap(c => c.products).find(p => p.id === pendingSauce.id)
      if (product) {
        setCart((prev) => [...prev, { product, quantity: 1 }])
      }
    }
    setPendingSauce(null)
  }

  const updateQuantity = (itemIndex: number, delta: number) => {
    setCart((prev) => {
      const newCart = [...prev]
      const item = newCart[itemIndex]
      const newQuantity = item.quantity + delta
      
      if (newQuantity <= 0) {
        // Remove item and any supplements/sauces attached to it
        const productId = item.product.id
        return newCart.filter((_, idx) => 
          idx !== itemIndex && newCart[idx].attachedToProductId !== productId
        )
      }
      
      newCart[itemIndex] = { ...item, quantity: newQuantity }
      return newCart
    })
  }

  const removeFromCart = (itemIndex: number) => {
    setCart((prev) => {
      const productId = prev[itemIndex].product.id
      // Remove item and any supplements/sauces attached to it
      return prev.filter((_, idx) => 
        idx !== itemIndex && prev[idx].attachedToProductId !== productId
      )
    })
  }

  const subtotal = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0)

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
          items: cart.map((i) => ({ 
            productId: i.product.id, 
            quantity: i.quantity,
            attachedToProductId: i.attachedToProductId 
          })),
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
      const res = await fetch('/api/orders/pos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: cart.map((i) => ({ 
            productId: i.product.id, 
            quantity: i.quantity,
            attachedToProductId: i.attachedToProductId 
          })),
          notes: 'COMMANDE SUR PLACE - POS',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la création')
      }

      setMessage({ type: 'success', text: `Commande sur place ${data.orderNumber} créée!` })
      setLastPOSOrder(data)
      resetForm()
      
      // Auto-print ticket after a short delay
      setTimeout(() => {
        print()
      }, 500)
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
    <div className="p-2 sm:p-4 lg:p-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2">
        <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900">Point de Vente</h1>
        {lastPOSOrder && (
          <Button
            onClick={() => print()}
            variant="outline"
            className="gap-2 border-bm-primary text-bm-primary hover:bg-bm-primary-50 w-full sm:w-auto text-sm"
            size="sm"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Réimprimer dernier ticket</span>
            <span className="sm:hidden">Réimprimer</span>
          </Button>
        )}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 flex-1 min-h-0">
        {/* Product Grid */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'pos' | 'phone')} className="mb-2 sm:mb-3">
            <TabsList className="h-10 sm:h-12 w-full grid grid-cols-2">
              <TabsTrigger value="pos" className="min-h-[40px] sm:min-h-[44px] px-2 sm:px-4 gap-1 sm:gap-2 text-sm">
                <Store className="h-3 w-3 sm:h-4 sm:w-4" /> 
                <span className="hidden xs:inline">Sur Place</span>
                <span className="xs:hidden">POS</span>
              </TabsTrigger>
              <TabsTrigger value="phone" className="min-h-[40px] sm:min-h-[44px] px-2 sm:px-4 gap-1 sm:gap-2 text-sm">
                <Phone className="h-3 w-3 sm:h-4 sm:w-4" /> 
                <span className="hidden xs:inline">Téléphone</span>
                <span className="xs:hidden">Tel</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Category Tabs */}
          <div className="category-tabs mb-2 sm:mb-3 -mx-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`category-tab text-xs sm:text-sm ${activeCategory === cat.id ? 'category-tab-active' : 'category-tab-inactive'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 pr-2">
              {categories
                .find((c) => c.id === activeCategory)
                ?.products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="flex flex-col items-center justify-center p-2 sm:p-3 bg-white rounded-xl border-2 border-stone-100 hover:border-bm-primary hover:shadow-md transition-all active:scale-95"
                  >
                    {/* Product Image */}
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full aspect-square object-cover rounded-lg mb-1 sm:mb-2"
                      />
                    ) : (
                      <div className="w-full aspect-square bg-stone-100 rounded-lg mb-1 sm:mb-2 flex items-center justify-center">
                        <span className="text-2xl sm:text-4xl opacity-30">🍔</span>
                      </div>
                    )}
                    <span className="font-bold text-stone-800 text-xs sm:text-sm text-center leading-tight line-clamp-2">{product.name}</span>
                    <span className="text-bm-primary font-extrabold text-sm sm:text-lg mt-1">{formatDA(product.price)}</span>
                  </button>
                ))}
            </div>
          </ScrollArea>
        </div>

        {/* Cart Sidebar */}
        <div className="flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col border-2 border-bm-primary-200 shadow-lg">
            <CardHeader className="pb-2 sm:pb-3 border-b">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-bm-primary" />
                <span>Panier</span>
                {cart.length > 0 && (
                  <Badge className="bg-bm-primary text-stone-900 ml-auto text-xs">{cart.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
              <ScrollArea className="flex-1 px-2 sm:px-4 py-2 sm:py-3">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-stone-400 text-xs sm:text-sm">
                    Panier vide
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item, idx) => {
                      // Skip attached items (they'll be shown with their parent)
                      if (item.attachedToProductId) return null

                      // Find attached supplements/sauces for this item
                      const attachedItems = cart.filter(
                        (ci) => ci.attachedToProductId === item.product.id
                      )

                      return (
                        <div key={idx}>
                          {/* Main Item */}
                          <div className="flex items-center gap-2 bg-stone-50 rounded-lg p-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-stone-800 truncate">{item.product.name}</p>
                              <p className="text-xs text-stone-500">{formatDA(item.product.price)} × {item.quantity}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => updateQuantity(idx, -1)}
                                className="qty-btn h-8 w-8 text-sm"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(idx, 1)}
                                className="qty-btn h-8 w-8 text-sm"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <span className="font-bold text-sm text-stone-800 w-16 text-right">
                              {formatDA(item.product.price * item.quantity)}
                            </span>
                            <button
                              onClick={() => removeFromCart(idx)}
                              className="p-1 text-red-400 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Attached Supplements/Sauces */}
                          {attachedItems.length > 0 && (
                            <div className="ml-6 mt-1 space-y-1">
                              {attachedItems.map((attached, attachedIdx) => {
                                const actualIdx = cart.findIndex(
                                  (ci) => ci === attached
                                )
                                return (
                                  <div
                                    key={actualIdx}
                                    className="flex items-center gap-2 bg-bm-primary-50/50 rounded-lg p-2 text-xs border-l-2 border-bm-primary"
                                  >
                                    <span className="text-bm-primary">+</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-stone-700 truncate">
                                        {attached.product.name}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => updateQuantity(actualIdx, -1)}
                                        className="qty-btn h-6 w-6 text-xs"
                                      >
                                        <Minus className="h-2 w-2" />
                                      </button>
                                      <span className="w-6 text-center font-bold text-xs">
                                        {attached.quantity}
                                      </span>
                                      <button
                                        onClick={() => updateQuantity(actualIdx, 1)}
                                        className="qty-btn h-6 w-6 text-xs"
                                      >
                                        <Plus className="h-2 w-2" />
                                      </button>
                                    </div>
                                    <span className="font-bold text-xs text-stone-700 w-12 text-right">
                                      {formatDA(attached.product.price * attached.quantity)}
                                    </span>
                                    <button
                                      onClick={() => removeFromCart(actualIdx)}
                                      className="p-0.5 text-red-400 hover:text-red-600"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
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

      {/* Hidden Kitchen Ticket for Printing */}
      <div style={{ display: 'none' }}>
        {lastPOSOrder && (
          <div ref={ticketRef}>
            <KitchenTicket order={lastPOSOrder} />
          </div>
        )}
      </div>

      {/* Supplement Picker */}
      <SupplementPicker
        open={supplementPickerOpen}
        onOpenChange={setSupplementPickerOpen}
        supplement={pendingSupplement}
        onSelect={handleSupplementSelect}
        onSkip={handleSupplementSkip}
      />

      {/* Sauce Picker */}
      {pendingSauce && (
        <SaucePicker
          open={saucePickerOpen}
          onOpenChange={setSaucePickerOpen}
          sauce={pendingSauce}
          burgersInCart={cart.filter((item) => isBurger(item.product, categories))}
          onSelect={handleSauceSelect}
          onSkip={handleSauceSkip}
          language="fr"
        />
      )}
    </div>
  )
}
