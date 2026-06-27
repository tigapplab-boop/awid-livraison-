'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { Product } from '@/bm/types'

interface SaucePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sauce: { id: string; name: string; nameAr: string | null } | null
  burgersInCart: Array<{ product: Product; quantity: number }>
  onSelect: (burgerProductId: string) => void
  onSkip: () => void
  language: 'fr' | 'ar'
}

export default function SaucePicker({
  open,
  onOpenChange,
  sauce,
  burgersInCart,
  onSelect,
  onSkip,
  language,
}: SaucePickerProps) {
  const isRTL = language === 'ar'

  if (!sauce) return null

  const sauceName = isRTL && sauce.nameAr ? sauce.nameAr : sauce.name

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
          <h2 className="text-2xl font-black mb-2" dir={isRTL ? 'rtl' : 'ltr'}>
            {isRTL ? '🍔 اختر البرجر' : '🍔 Choisir un burger'}
          </h2>
          <p className="text-white/90 text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
            {isRTL
              ? `لأي برجر تريد إضافة ${sauceName}؟`
              : `Pour quel burger voulez-vous ajouter ${sauceName} ?`}
          </p>
        </div>

        <div className="p-6 space-y-3">
          {burgersInCart.map((item, index) => {
            const productName = isRTL && item.product.nameAr ? item.product.nameAr : item.product.name
            return (
              <button
                key={`${item.product.id}-${index}`}
                onClick={() => onSelect(item.product.id)}
                className="w-full flex items-center gap-4 p-4 bg-white border-2 border-stone-200 hover:border-bm-primary hover:bg-bm-primary/5 rounded-xl transition-all"
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                {item.product.image && (
                  <img
                    src={item.product.image}
                    alt={productName}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <p className="font-bold text-stone-900">
                    {item.quantity}x {productName}
                  </p>
                  <p className="text-sm text-stone-500">
                    {(item.product.price / 100).toFixed(2)} DA
                  </p>
                </div>
                <div className="text-bm-primary font-bold">→</div>
              </button>
            )
          })}

          <div className="pt-3 border-t border-stone-200">
            <Button
              onClick={onSkip}
              variant="outline"
              className="w-full"
            >
              {isRTL ? 'تخطي (دون تحديد برجر)' : 'Passer (sans choisir de burger)'}
            </Button>
            <p className="text-xs text-center text-stone-400 mt-2" dir={isRTL ? 'rtl' : 'ltr'}>
              {isRTL
                ? 'ستُضاف الصلصة بشكل منفصل'
                : 'La sauce sera ajoutée séparément'}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
