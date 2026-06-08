import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useCart } from '@/bm/lib/cart';
import { getZones, calculateFee } from '@/bm/lib/api';
import type { DeliveryZone, FeeCalculation, CartItem } from '@/bm/types';
import { formatPrice } from '@/bm/lib/format';
import { useLocale } from '@/bm/lib/locale';
import { t } from '@/bm/lib/i18n';
import { Minus, Plus, ChevronLeft, ChevronRight, ArrowRight, ArrowLeft } from 'lucide-react';

function CartItemRow({
  item,
  isSupplement,
  burgerName,
}: {
  item: CartItem;
  isSupplement: boolean;
  burgerName?: string;
}) {
  const { updateQuantity, removeItem } = useCart();
  const { locale, isRTL } = useLocale();

  return (
    <div
      className={`flex items-center gap-4 rounded-2xl bg-white p-3.5 shadow-sm border border-stone-100/50 transition-all ${
        isSupplement ? (isRTL ? 'mr-6 border-r-4 border-r-bm-accent' : 'ml-6 border-l-4 border-l-bm-accent') : ''
      }`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className={`flex shrink-0 items-center justify-center rounded-xl overflow-hidden ${
        isSupplement ? 'h-10 w-10 bg-bm-accent-50/50' : 'h-16 w-16 bg-bm-primary-50'
      }`}>
        {item.product.image ? (
          <img
            src={item.product.image}
            alt={isRTL && item.product.nameAr ? item.product.nameAr : item.product.name}
            className={`w-full h-full object-cover`}
          />
        ) : (
          <span className={isSupplement ? 'text-lg' : 'text-3xl'}>
            {isSupplement ? '➕' : '🍔'}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className={`font-bold text-stone-900 truncate ${isSupplement ? 'text-sm' : 'text-base'}`}>
            {isRTL && item.product.nameAr ? item.product.nameAr : item.product.name}
          </h3>
          {isSupplement && (
            <span className="shrink-0 rounded-full bg-bm-accent-50 px-2 py-0.5 text-[10px] font-bold text-bm-accent uppercase tracking-wider">
              {t('cart.suppl', locale)}
            </span>
          )}
        </div>
        {isSupplement && burgerName && (
          <p className="text-xs text-stone-400 truncate mt-0.5 font-medium">
            {t('cart.for', locale)} {burgerName}
          </p>
        )}
        <p className={`font-bold text-bm-primary mt-1 ${isSupplement ? 'text-sm' : 'text-base'}`}>
          {formatPrice(item.product.price * item.quantity)}
        </p>
      </div>
      <div className={`flex items-center gap-1.5 bg-stone-50 rounded-full p-1 border border-stone-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button
          onClick={() =>
            item.quantity <= 1
              ? removeItem(item.product.id)
              : updateQuantity(item.product.id, item.quantity - 1)
          }
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-stone-600 shadow-sm hover:text-stone-900 transition-colors"
          aria-label="Diminuer quantité"
        >
          {item.quantity <= 1 ? (
            <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          ) : (
            <Minus className="h-4 w-4" />
          )}
        </button>
        <span className="w-6 text-center text-sm font-bold text-stone-900">
          {item.quantity}
        </span>
        <button
          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-stone-600 shadow-sm hover:text-stone-900 transition-colors"
          aria-label="Augmenter quantité"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function CartPage() {
  const {
    items,
    selectedZone,
    deliveryFee,
    isNightDelivery,
    subtotal,
    total,
    totalItems,
    setZone,
    clearZone,
  } = useCart();
  const { locale, isRTL, isMounted } = useLocale();

  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calculatingFee, setCalculatingFee] = useState(false);

  useEffect(() => {
    async function fetchZones() {
      try {
        setLoading(true);
        const data = await getZones();
        setZones(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    }
    fetchZones();
  }, []);

  const handleZoneChange = useCallback(
    async (zoneId: string) => {
      const zone = zones.find((z) => z.id === zoneId);
      if (!zone) return;

      setCalculatingFee(true);
      try {
        const feeCalc = await calculateFee(zone.id);
        setZone(zone, feeCalc);
      } catch {
        clearZone();
      } finally {
        setCalculatingFee(false);
      }
    },
    [zones, setZone, clearZone],
  );

  const groupedItems = (() => {
    const mainItems = items.filter((item) => !item.attachedToProductId);
    const result: Array<{
      type: 'main';
      item: CartItem;
      supplements: CartItem[];
    } | {
      type: 'standalone';
      item: CartItem;
    }> = [];

    for (const mainItem of mainItems) {
      const supplements = items.filter(
        (item) => item.attachedToProductId === mainItem.product.id
      );
      result.push({ type: 'main', item: mainItem, supplements });
    }
    return result;
  })();

  if (!isMounted) return null;

  if (items.length === 0) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-stone-50" dir={isRTL ? 'rtl' : 'ltr'}>
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-stone-200/50 px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/menu" className="w-10 h-10 flex items-center justify-center rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors">
              {isRTL ? <ChevronRight className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
            </Link>
            <h1 className="text-xl font-bold text-stone-900">{t('cart.title', locale)}</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <div className="w-32 h-32 bg-stone-200 rounded-full flex items-center justify-center mb-6">
            <svg className="h-16 w-16 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          </div>
          <p className="text-xl font-bold text-stone-800">{t('cart.empty', locale)}</p>
          <p className="mt-2 text-base text-stone-500 text-center">{t('cart.emptyDesc', locale)}</p>
          <Link href="/menu" className="btn-bm-lg btn-bm-primary mt-8 w-full max-w-xs flex items-center justify-center gap-2">
            {t('cart.backToMenu', locale)}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-stone-50" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-stone-200/50 px-4 py-4">
        <div className="flex items-center gap-4">
          <Link href="/menu" className="w-10 h-10 flex items-center justify-center rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors">
            {isRTL ? <ChevronRight className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-stone-900 leading-none">{t('cart.title', locale)}</h1>
            <p className="text-sm font-medium text-bm-primary mt-1">{totalItems} {totalItems > 1 ? t('cart.articles', locale) : t('cart.article', locale)}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-6 space-y-8">
        {/* Cart Items */}
        <div className="space-y-3">
          {groupedItems.map((group) => {
            if (group.type === 'main') {
              return (
                <div key={group.item.product.id} className="space-y-2 relative">
                  <CartItemRow
                    item={group.item}
                    isSupplement={false}
                  />
                  {group.supplements.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {group.supplements.map((supp) => (
                        <CartItemRow
                          key={`${supp.product.id}-${supp.attachedToProductId}`}
                          item={supp}
                          isSupplement={true}
                          burgerName={isRTL && group.item.product.nameAr ? group.item.product.nameAr : group.item.product.name}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <CartItemRow
                key={group.item.product.id}
                item={group.item}
                isSupplement={false}
              />
            );
          })}
        </div>

        {/* Delivery Zone Selector */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-stone-100/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-stone-900">
              {t('cart.deliveryZone', locale)}
            </h2>
          </div>
          
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-16 bg-stone-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm font-medium text-red-500 bg-red-50 p-3 rounded-xl">{error}</p>
          ) : zones.length === 0 ? (
            <p className="text-sm font-medium text-stone-500 bg-stone-50 p-3 rounded-xl">{t('cart.noZone', locale)}</p>
          ) : (
            <div className="space-y-3">
              {zones.map((zone) => (
                <button
                  key={zone.id}
                  onClick={() => handleZoneChange(zone.id)}
                  className={`flex w-full items-center justify-between rounded-2xl border-2 px-4 py-3.5 transition-all ${
                    selectedZone?.id === zone.id
                      ? 'border-bm-primary bg-bm-primary-50/50'
                      : 'border-stone-100 bg-white hover:border-stone-200'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selectedZone?.id === zone.id
                          ? 'border-bm-primary bg-bm-primary'
                          : 'border-stone-300'
                      }`}
                    >
                      {selectedZone?.id === zone.id && <div className="w-2 h-2 bg-stone-900 rounded-full" />}
                    </div>
                    <span className={`font-bold ${selectedZone?.id === zone.id ? 'text-stone-900' : 'text-stone-700'}`}>
                      {zone.name}
                    </span>
                  </div>
                  <span className={`text-sm font-bold ${selectedZone?.id === zone.id ? 'text-bm-primary' : 'text-stone-500'}`}>
                    {calculatingFee && selectedZone?.id === zone.id ? '...' : formatPrice(zone.dayFee)}
                    {zone.nightFee !== zone.dayFee && (
                      <span className="text-[10px] text-bm-accent ml-1 font-bold bg-bm-accent-50 px-1.5 py-0.5 rounded-md">
                        {t('cart.night', locale)}: {formatPrice(zone.nightFee)}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-stone-100/50 space-y-4">
          <div className="flex justify-between items-center text-stone-600 font-medium">
            <span>{t('cart.subtotal', locale)}</span>
            <span className="text-stone-900 font-bold">{formatPrice(subtotal)}</span>
          </div>
          {selectedZone && (
            <div className="flex justify-between items-center text-stone-600 font-medium">
              <span className="flex items-center gap-1.5">
                {t('cart.delivery', locale)} ({selectedZone.name})
                {isNightDelivery && (
                  <span className="text-[10px] text-bm-accent font-bold bg-bm-accent-50 px-1.5 py-0.5 rounded-md">🌙 {t('cart.night', locale)}</span>
                )}
              </span>
              <span className="text-stone-900 font-bold">{formatPrice(deliveryFee)}</span>
            </div>
          )}
          <div className="pt-4 border-t border-stone-100">
            <div className="flex justify-between items-end">
              <span className="text-lg font-bold text-stone-900">{t('cart.total', locale)}</span>
              <span className="text-2xl font-black text-bm-primary">{formatPrice(total)}</span>
            </div>
          </div>
        </div>
        
        {/* Bottom spacer for fixed checkout button */}
        <div className="h-24"></div>
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-stone-50 via-stone-50 to-transparent z-40 pb-safe-bottom">
        <Link
          href={selectedZone ? '/checkout' : '#'}
          className={`flex items-center justify-center gap-2 h-14 rounded-full font-bold text-lg transition-all shadow-xl ${
            selectedZone 
              ? 'bg-bm-primary text-stone-900 hover:brightness-105 active:scale-95 shadow-bm-primary/30' 
              : 'bg-stone-200 text-stone-400 cursor-not-allowed'
          }`}
          onClick={(e) => {
            if (!selectedZone) e.preventDefault();
          }}
        >
          {selectedZone ? t('cart.checkout', locale) : t('cart.selectZone', locale)}
          {selectedZone && (isRTL ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />)}
        </Link>
      </div>
    </div>
  );
}
