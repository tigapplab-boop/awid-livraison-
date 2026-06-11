'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import SauceSelector from './SauceSelector'

interface Product {
  id: string
  name: string
  nameAr: string | null
  description: string | null
  descriptionAr: string | null
  price: number
  image: string | null
  category: {
    id: string
    name: string
  }
}

interface ProductDetailModalProps {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddToCart: (product: Product, quantity: number, sauces: string[]) => void
  language: 'fr' | 'ar'
}

export default function ProductDetailModal({
  product,
  open,
  onOpenChange,
  onAddToCart,
  language,
}: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [selectedSauces, setSelectedSauces] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      setQuantity(1)
      setSelectedSauces([])
    }
  }, [open])

  if (!product) return null

  const isBurger =
    product.category.name.toLowerCase().includes('burger') ||
    product.category.name.toLowerCase().includes('sandwich')

  const productName = language === 'ar' && product.nameAr ? product.nameAr : product.name
  const productDesc =
    language === 'ar' && product.descriptionAr
      ? product.descriptionAr
      : product.description || 'Délicieux produit de notre menu.'

  const handleAddToCart = () => {
    onAddToCart(product, quantity, selectedSauces)
    onOpenChange(false)
  }

  const incrementQuantity = () => setQuantity((q) => q + 1)
  const decrementQuantity = () => setQuantity((q) => Math.max(1, q - 1))

  const totalPrice = product.price * quantity

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        {/* Image */}
        {product.image && (
          <div className="relative w-full h-64 bg-stone-100">
            <img
              src={product.image}
              alt={productName}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {/* Nom */}
          <h2
            className="text-2xl font-black text-stone-900 mb-2"
            dir={language === 'ar' ? 'rtl' : 'ltr'}
          >
            {productName}
          </h2>

          {/* Description */}
          <p
            className="text-stone-600 mb-4 leading-relaxed"
            dir={language === 'ar' ? 'rtl' : 'ltr'}
          >
            {productDesc}
          </p>

          {/* Prix */}
          <div className="text-3xl font-black text-bm-primary mb-6">
            {(product.price / 100).toFixed(2)} DA
          </div>

          {/* Sauces (si burger/sandwich) */}
          {isBurger && (
            <div className="mb-6">
              <SauceSelector
                selectedSauces={selectedSauces}
                onSelectionChange={setSelectedSauces}
                language={language}
              />
            </div>
          )}

          {/* Quantité */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-stone-700 mb-2">
              {language === 'ar' ? 'الكمية' : 'Quantité'}
            </label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={decrementQuantity}
                className="h-10 w-10"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-2xl font-bold text-stone-900 w-12 text-center">
                {quantity}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={incrementQuantity}
                className="h-10 w-10"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Info Box (sauces gratuites) */}
          {isBurger && selectedSauces.length > 0 && (
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                {language === 'ar'
                  ? '✓ الصلصات مجانية'
                  : '✓ Les sauces sont gratuites'}
              </p>
            </div>
          )}

          {/* Bouton Ajouter */}
          <Button
            onClick={handleAddToCart}
            className="w-full h-14 text-lg font-bold bg-bm-primary hover:bg-bm-primary/90 text-stone-900"
          >
            {language === 'ar'
              ? `أضف إلى السلة - ${(totalPrice / 100).toFixed(2)} DA`
              : `Ajouter au panier - ${(totalPrice / 100).toFixed(2)} DA`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
