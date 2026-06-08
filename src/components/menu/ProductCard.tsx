import type { Locale } from '@/lib/locale'

interface ProductCardProps {
  product: {
    id: string
    name: string
    nameAr: string | null
    description: string | null
    descriptionAr?: string | null
    price: number // centimes
    image: string | null
    isAvailable: boolean
  }
  onAdd: (productId: string) => void
  quantityInCart: number
  locale: Locale
  animatingProduct?: string | null
}

export function ProductCard({ product, onAdd, quantityInCart, locale, animatingProduct }: ProductCardProps) {
  const isRTL = locale === 'ar'

  return (
    <div 
      className={`
        relative bg-white rounded-2xl overflow-hidden
        shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-all duration-200
        active:scale-[0.98]
        ${isRTL ? 'rtl' : 'ltr'}
      `}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] bg-[#F8F5F0] overflow-hidden">
        {product.image ? (
          <img 
            src={product.image} 
            alt={isRTL ? product.nameAr || product.name : product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <span className="text-4xl opacity-50">🍔</span>
          </div>
        )}

        {/* Badge Promo (si applicable) */}
        {product.price < 50000 && ( // Example logic for promo
          <div className={`
            absolute top-2 ${isRTL ? 'right-2' : 'left-2'}
            bg-bm-primary text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm
          `}>
            {isRTL ? 'عرض' : 'PROMO'}
          </div>
        )}

        {/* Quantity Badge (si dans panier) */}
        {quantityInCart > 0 && (
          <div className={`
            absolute top-2 ${isRTL ? 'left-2' : 'right-2'}
            bg-[#00C853] text-white text-xs font-bold w-6 h-6 
            rounded-full flex items-center justify-center shadow-md animate-in zoom-in duration-200
          `}>
            {quantityInCart}
          </div>
        )}
      </div>

      {/* Info Container */}
      <div className="p-3">
        <h3 className="text-[#1A1A1A] font-semibold text-[15px] leading-tight mb-1 truncate">
          {isRTL ? product.nameAr || product.name : product.name}
        </h3>

        {product.description && (
          <p className="text-[#6B6B6B] text-[11px] leading-relaxed mb-2 line-clamp-2 min-h-[33px]">
            {isRTL ? product.descriptionAr || product.description : product.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-auto">
          <span className="text-[#1A1A1A] font-bold text-base">
            {(product.price / 100).toLocaleString()} <span className="text-[11px] font-medium text-[#6B6B6B] ml-0.5">DA</span>
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation()
              onAdd(product.id)
            }}
            disabled={!product.isAvailable}
            className={`
              w-9 h-9 rounded-full flex items-center justify-center
              ${product.isAvailable 
                ? 'bg-bm-primary text-stone-900 hover:bg-[#FF8A00] active:scale-90 shadow-sm' 
                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
              }
              transition-all duration-150
              ${animatingProduct === product.id ? 'add-to-cart-animate scale-90' : 'scale-100'}
            `}
            aria-label={isRTL ? 'أضف إلى السلة' : 'Ajouter au panier'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
