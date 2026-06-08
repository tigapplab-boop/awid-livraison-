import type { Locale } from '@/lib/locale'

export function PromoBanner({ locale }: { locale: Locale }) {
  const isRTL = locale === 'ar'

  return (
    <div className="mx-4 mt-4 mb-2 rounded-2xl overflow-hidden bg-gradient-to-r from-bm-primary to-[#FF8C00] text-stone-900 p-4 relative shadow-sm">
      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className="text-4xl animate-bounce drop-shadow-sm">🎉</div>
        <div className="flex-1">
          <p className="text-[11px] font-bold opacity-80 uppercase tracking-wider mb-0.5">
            {isRTL ? 'عرض اليوم' : 'PROMO DU JOUR'}
          </p>
          <p className="text-[15px] font-bold leading-tight">
            {isRTL ? 'قائمة مزدوجة + بطاطا = 650 دج' : 'Menu Double + Frites = 650 DA'}
          </p>
        </div>
      </div>
      {/* Decorative background circle */}
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-white opacity-10 rounded-full" />
      <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-white opacity-10 rounded-full" />
    </div>
  )
}
