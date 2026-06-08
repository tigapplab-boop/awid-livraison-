'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { getTempOrder, updateTempOrder, getProducts, getZones, calculateFee } from '@/bm/lib/api';
import { useCart, isSupplement } from '@/bm/lib/cart';
import type { CategoryWithProducts, DeliveryZone, FeeCalculation, OrderTempRedis, Product, TempOrderItemDto, CartItem } from '@/bm/types';
import { formatPrice } from '@/bm/lib/format';
import { useLocale } from '@/lib/locale';
import { t } from '@/lib/i18n';
import SupplementPicker from '@/components/SupplementPicker';
import { ChevronLeft, ChevronRight, Check, X, Minus, Plus } from 'lucide-react';

const CATEGORY_ICONS: Record<string, string> = {
  'Nos Burgers': '🍔',
  'Suppléments': '➕',
  'Frites': '🍟',
  'Nos Boissons': '🥤',
};

function ModifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { locale, isRTL, isMounted } = useLocale();

  const {
    items,
    selectedZone,
    total,
    totalItems,
    addItem,
    removeItem,
    updateQuantity,
    setZone,
    clearCart,
  } = useCart();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryWithProducts[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [existingOrder, setExistingOrder] = useState<OrderTempRedis | null>(null);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [supplementPickerOpen, setSupplementPickerOpen] = useState(false);
  const [pendingSupplement, setPendingSupplement] = useState<Product | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const isScrollingRef = useRef(false);

  useEffect(() => {
    async function loadOrder() {
      if (!token) {
        setError(isRTL ? 'الرمز مفقود' : 'Token manquant');
        setLoading(false);
        return;
      }

      try {
        const [order, productsData, zonesData] = await Promise.all([
          getTempOrder(token),
          getProducts(),
          getZones(),
        ]);

        setExistingOrder(order);
        setCategories(productsData);
        setZones(zonesData);

        if (productsData.length > 0) {
          setActiveSection(productsData[0].id);
        }

        const matchingZone = zonesData.find((z) => z.id === order.deliveryZoneId);
        if (matchingZone) {
          const feeCalc: FeeCalculation = {
            zoneId: matchingZone.id,
            zoneName: matchingZone.name,
            dayFee: matchingZone.dayFee,
            nightFee: matchingZone.nightFee,
            currentFee: order.deliveryFee,
            isNight: order.isNightDelivery,
            startNight: matchingZone.startNight,
            endNight: matchingZone.endNight,
          };
          setZone(matchingZone, feeCalc);
        }

        clearCart();

        const allProducts: Product[] = productsData.flatMap((c) => c.products);
        const productMap = new Map(allProducts.map((p) => [p.id, p]));

        const mainItems = order.items.filter((item) => {
          const product = productMap.get(item.productId);
          return product && !isSupplement(product);
        });

        const supplementItems = order.items.filter((item) => {
          const product = productMap.get(item.productId);
          return product && isSupplement(product);
        });

        for (const item of mainItems) {
          const product = productMap.get(item.productId);
          if (product) {
            addItem(product, item.quantity);
          }
        }

        for (const item of supplementItems) {
          const product = productMap.get(item.productId);
          if (product) {
            let attachedToProductId: string | undefined;
            if (item.notes) {
              const match = item.notes.match(/Pour\s+(.+)/);
              if (match) {
                const burgerName = match[1].trim();
                const burger = mainItems.find((mi) => {
                  const p = productMap.get(mi.productId);
                  return p && p.name === burgerName;
                });
                if (burger) {
                  attachedToProductId = burger.productId;
                }
              }
            }
            addItem(product, item.quantity, attachedToProductId);
          }
        }
      } catch {
        setError(isRTL ? 'الطلب غير موجود أو منتهي الصلاحية' : 'Commande introuvable ou expirée');
      } finally {
        setLoading(false);
      }
    }
    loadOrder();
  }, [token, addItem, setZone, clearCart, isRTL]);

  useEffect(() => {
    if (loading || categories.length === 0) return;

    const handleScroll = () => {
      if (isScrollingRef.current) return;

      const scrollY = window.scrollY + 200;

      for (let i = categories.length - 1; i >= 0; i--) {
        const cat = categories[i];
        const el = sectionRefs.current[cat.id];
        if (el && el.offsetTop <= scrollY) {
          setActiveSection(cat.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, categories]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const scrollToSection = (categoryId: string) => {
    const el = sectionRefs.current[categoryId];
    if (!el) return;

    isScrollingRef.current = true;
    setActiveSection(categoryId);

    const top = el.offsetTop - 190;
    window.scrollTo({ top, behavior: 'smooth' });

    setTimeout(() => {
      isScrollingRef.current = false;
    }, 800);
  };

  const handleZoneChange = useCallback(
    async (zoneId: string) => {
      const zone = zones.find((z) => z.id === zoneId);
      if (!zone) return;
      try {
        const feeCalc = await calculateFee(zone.id);
        setZone(zone, feeCalc);
      } catch {
        // Keep existing zone
      }
    },
    [zones, setZone],
  );

  const handleAddSupplement = useCallback((product: Product) => {
    const burgersInCart = items.filter((item) => !item.attachedToProductId);
    if (burgersInCart.length === 0) {
      setToastMessage(isRTL ? 'أضف برجر أولاً قبل اختيار الإضافة' : 'Ajoutez d\'abord un burger avant de choisir un supplément');
      return;
    }
    if (burgersInCart.length === 1) {
      addItem(product, 1, burgersInCart[0].product.id);
      return;
    }
    setPendingSupplement(product);
    setSupplementPickerOpen(true);
  }, [items, addItem, isRTL]);

  const handleSupplementSelect = useCallback((attachedToProductId: string) => {
    if (pendingSupplement) {
      addItem(pendingSupplement, 1, attachedToProductId);
    }
    setPendingSupplement(null);
  }, [pendingSupplement, addItem]);

  const handleSupplementSkip = useCallback(() => {
    if (pendingSupplement) {
      addItem(pendingSupplement, 1);
    }
    setPendingSupplement(null);
  }, [pendingSupplement, addItem]);

  const handleSubmit = useCallback(async () => {
    if (!token || !selectedZone || items.length === 0) return;

    setSubmitting(true);
    setError(null);

    try {
      const dtoItems: TempOrderItemDto[] = items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        notes: item.attachedToProductId
          ? `Pour ${items.find((i) => i.product.id === item.attachedToProductId)?.product.name || 'burger'}`
          : undefined,
      }));

      const result = await updateTempOrder(token, {
        clientAddress: existingOrder?.clientAddress,
        deliveryZone: selectedZone.id,
        items: dtoItems,
      });

      router.push(`/waiting?token=${result.tempToken}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la modification';
      setError(message);
      setSubmitting(false);
    }
  }, [token, selectedZone, items, existingOrder, router]);

  const groupedItems = useMemo(() => {
    const mainItems = items.filter((item) => !item.attachedToProductId);
    const result: Array<{
      type: 'main';
      item: CartItem;
      supplements: CartItem[];
    }> = [];

    for (const mainItem of mainItems) {
      const supplements = items.filter(
        (item) => item.attachedToProductId === mainItem.product.id
      );
      result.push({ type: 'main', item: mainItem, supplements });
    }

    return result;
  }, [items]);

  if (!isMounted) return null;

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-stone-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-bm-primary border-t-transparent" />
      </div>
    );
  }

  if (error && !existingOrder) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 bg-stone-50" dir={isRTL ? 'rtl' : 'ltr'}>
        <X className="mb-4 h-16 w-16 text-red-400" />
        <p className="text-lg font-bold text-stone-700">{error}</p>
        <Link href="/menu" className="btn-bm-lg btn-bm-primary mt-6">
          {t('waiting.backToMenu', locale)}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-stone-50" dir={isRTL ? 'rtl' : 'ltr'}>
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-stone-200/50 px-4 py-4">
        <div className="flex items-center gap-4">
          <Link href="/menu" className="w-10 h-10 flex items-center justify-center rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors">
            {isRTL ? <ChevronRight className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
          </Link>
          <div>
            <h1 className="text-xl font-bold text-stone-900 leading-none">{isRTL ? 'تعديل الطلب' : 'Modifier la commande'}</h1>
            <p className="text-sm font-medium text-stone-500 mt-1">{isRTL ? 'قم بتعديل عناصرك وتأكيدها' : 'Modifiez vos articles et confirmez'}</p>
          </div>
        </div>
      </header>

      {/* Cart summary */}
      {items.length > 0 && (
        <div className="bg-white p-5 border-b border-stone-100/50">
          <h2 className="mb-3 text-base font-bold text-stone-900">{t('cart.title', locale)} ({totalItems})</h2>
          <div className="space-y-3">
            {groupedItems.map((group) => (
              <div key={group.item.product.id} className="bg-stone-50 rounded-2xl p-3 border border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <span className="text-sm font-bold text-stone-800">
                      {isRTL && group.item.product.nameAr ? group.item.product.nameAr : group.item.product.name}
                    </span>
                    <p className="text-sm font-bold text-bm-primary mt-0.5">{formatPrice(group.item.product.price * group.item.quantity)}</p>
                  </div>
                  <div className={`flex items-center gap-1.5 bg-white rounded-full p-1 border border-stone-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <button
                      onClick={() =>
                        group.item.quantity <= 1
                          ? removeItem(group.item.product.id)
                          : updateQuantity(group.item.product.id, group.item.quantity - 1)
                      }
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-50 text-stone-600 hover:text-stone-900"
                    >
                      {group.item.quantity <= 1 ? <X className="h-3 w-3 text-red-500" /> : <Minus className="h-3 w-3" />}
                    </button>
                    <span className="w-5 text-center text-xs font-bold text-stone-900">{group.item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(group.item.product.id, group.item.quantity + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-50 text-stone-600 hover:text-stone-900"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                {group.supplements.length > 0 && (
                  <div className={`mt-2 space-y-2 ${isRTL ? 'mr-2 pr-3 border-r-2 border-bm-accent-100' : 'ml-2 pl-3 border-l-2 border-bm-accent-100'}`}>
                    {group.supplements.map((supp) => (
                      <div key={`${supp.product.id}-${supp.attachedToProductId}`} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-stone-600">
                              {isRTL && supp.product.nameAr ? supp.product.nameAr : supp.product.name}
                            </span>
                            <span className="shrink-0 rounded-full bg-bm-accent-50 px-1.5 py-0.5 text-[9px] font-bold text-bm-accent uppercase">
                              {t('cart.suppl', locale)}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-stone-500 mt-0.5">{formatPrice(supp.product.price * supp.quantity)}</p>
                        </div>
                        <div className={`flex items-center gap-1 bg-white rounded-full p-0.5 border border-stone-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <button
                            onClick={() =>
                              supp.quantity <= 1
                                ? removeItem(supp.product.id)
                                : updateQuantity(supp.product.id, supp.quantity - 1)
                            }
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-50 text-stone-500"
                          >
                            {supp.quantity <= 1 ? <X className="h-3 w-3 text-red-400" /> : <Minus className="h-3 w-3" />}
                          </button>
                          <span className="w-4 text-center text-[10px] font-bold text-stone-800">{supp.quantity}</span>
                          <button
                            onClick={() => updateQuantity(supp.product.id, supp.quantity + 1)}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-50 text-stone-500"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zone selector */}
      {zones.length > 0 && (
        <div className="bg-white p-5 border-b border-stone-100/50 mt-2">
          <h2 className="mb-3 text-base font-bold text-stone-900">{t('cart.deliveryZone', locale)}</h2>
          <div className="flex flex-wrap gap-2">
            {zones.map((zone) => (
              <button
                key={zone.id}
                onClick={() => handleZoneChange(zone.id)}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition-all border-2 ${
                  selectedZone?.id === zone.id
                    ? 'border-bm-primary bg-bm-primary-50/50 text-stone-900'
                    : 'border-stone-100 bg-white text-stone-600 hover:border-stone-200'
                }`}
              >
                {zone.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category nav */}
      {categories.length > 0 && (
        <div className="sticky top-[73px] z-30 bg-white/90 backdrop-blur-xl border-b border-stone-100/50 pb-2 pt-2 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 px-4 w-max">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => scrollToSection(category.id)}
                className={`flex items-center gap-2 h-10 px-4 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
                  activeSection === category.id 
                    ? 'bg-stone-900 text-white shadow-lg shadow-stone-900/20' 
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <span>{CATEGORY_ICONS[category.name] || '🍽️'}</span>
                <span>{isRTL && category.nameAr ? category.nameAr : category.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Products */}
      <div className="flex-1 pb-40 px-4 py-6 space-y-8">
        {categories.map((category) => {
          const sectionEl = (ref: HTMLElement | null) => { sectionRefs.current[category.id] = ref; };
          return (
            <section
              key={category.id}
              ref={sectionEl}
              id={`section-modify-${category.id}`}
            >
              <div className="mb-4 flex items-center gap-2">
                <span className="text-2xl">{CATEGORY_ICONS[category.name] || '🍽️'}</span>
                <h2 className="text-xl font-black text-stone-900 tracking-tight">
                  {isRTL && category.nameAr ? category.nameAr : category.name}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {category.products.map((product) => {
                  const cartItemsForProduct = items.filter((i) => i.product.id === product.id);
                  const totalQuantity = cartItemsForProduct.reduce((sum, i) => sum + i.quantity, 0);
                  const primaryCartItem = cartItemsForProduct.find((i) => !i.attachedToProductId) || cartItemsForProduct[0];

                  const handleAdd = () => {
                    if (isSupplement(product)) {
                      handleAddSupplement(product);
                    } else {
                      addItem(product);
                    }
                  };

                  const handleDecrease = () => {
                    if (!primaryCartItem) return;
                    if (primaryCartItem.quantity <= 1) {
                      removeItem(product.id);
                    } else {
                      updateQuantity(product.id, primaryCartItem.quantity - 1);
                    }
                  };

                  return (
                    <div key={product.id} className="group relative flex gap-3 rounded-3xl bg-white p-3 shadow-sm border border-stone-100/50 transition-all hover:border-bm-primary/50 hover:shadow-xl hover:shadow-bm-primary/5">
                      <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-bm-primary-50 to-bm-accent-50/30">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                        ) : (
                          <span className="text-4xl">{CATEGORY_ICONS[category.name] || '🍽️'}</span>
                        )}
                        {totalQuantity > 0 && (
                          <span className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-xs font-bold text-white shadow-lg shadow-stone-900/30 ring-2 ring-white">
                            {totalQuantity}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-1 flex-col py-1 min-w-0">
                        <div className="mb-auto">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-base font-bold text-stone-900 leading-tight">
                              {isRTL && product.nameAr ? product.nameAr : product.name}
                            </h3>
                            {isSupplement(product) && (
                              <span className="shrink-0 rounded-full bg-bm-accent-50 px-2 py-0.5 text-[10px] font-bold text-bm-accent uppercase tracking-wider">
                                {t('cart.suppl', locale)}
                              </span>
                            )}
                          </div>
                          {product.description && (
                            <p className="mt-1 text-xs font-medium text-stone-500 leading-snug line-clamp-2">{product.description}</p>
                          )}
                        </div>
                        
                        <div className="flex items-end justify-between mt-2">
                          <span className="text-lg font-black text-bm-primary">{formatPrice(product.price)}</span>
                          {totalQuantity > 0 ? (
                            <div className={`flex items-center gap-1.5 bg-stone-50 rounded-full p-1 border border-stone-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <button
                                onClick={handleDecrease}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-stone-600 shadow-sm"
                              >
                                {primaryCartItem && primaryCartItem.quantity <= 1 ? (
                                  <X className="h-3.5 w-3.5 text-red-500" />
                                ) : (
                                  <Minus className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <span className="w-5 text-center text-sm font-bold text-stone-900">{totalQuantity}</span>
                              <button
                                onClick={() => addItem(product)}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-stone-600 shadow-sm"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={handleAdd}
                              className="flex h-9 items-center justify-center rounded-full bg-stone-900 px-4 text-xs font-bold text-white shadow-lg shadow-stone-900/20 transition-all active:scale-95"
                            >
                              <Plus className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                              {t('menu.addToCart', locale)}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed left-4 right-4 top-24 z-50 animate-in slide-in-from-top-2 rounded-2xl bg-stone-900 px-4 py-3 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bm-accent/20">
              <span className="text-bm-accent">ℹ</span>
            </div>
            <p className="text-sm font-bold text-white">{toastMessage}</p>
          </div>
        </div>
      )}

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-stone-50 via-stone-50 to-transparent z-40 pb-safe-bottom">
        <div className="mx-auto max-w-lg">
          <div className="mb-3 flex items-center justify-between px-2">
            <span className="text-sm font-bold text-stone-600 bg-white px-3 py-1 rounded-full shadow-sm">
              {totalItems} {totalItems > 1 ? t('cart.articles', locale) : t('cart.article', locale)} + {t('cart.delivery', locale)}
            </span>
            <span className="text-xl font-black text-bm-primary drop-shadow-sm">{formatPrice(total)}</span>
          </div>
          {error && <p className="mb-3 text-xs font-bold text-red-500 bg-red-50 px-3 py-2 rounded-xl text-center">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={submitting || items.length === 0 || !selectedZone}
            className={`flex items-center justify-center gap-2 h-14 w-full rounded-full font-bold text-lg transition-all shadow-xl ${
              submitting || items.length === 0 || !selectedZone
                ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                : 'bg-bm-primary text-stone-900 hover:brightness-105 active:scale-95 shadow-bm-primary/30'
            }`}
          >
            {submitting ? (
              <>
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-stone-400 border-t-stone-600" />
                {isRTL ? 'جاري التعديل...' : 'Modification...'}
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                {isRTL ? 'تأكيد التعديل' : 'Confirmer la modification'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Supplement Picker */}
      <SupplementPicker
        open={supplementPickerOpen}
        onOpenChange={setSupplementPickerOpen}
        supplement={pendingSupplement}
        onSelect={handleSupplementSelect}
        onSkip={handleSupplementSkip}
      />
    </div>
  );
}

export default function ModifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-stone-50">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-bm-primary border-t-transparent" />
        </div>
      }
    >
      <ModifyContent />
    </Suspense>
  );
}
