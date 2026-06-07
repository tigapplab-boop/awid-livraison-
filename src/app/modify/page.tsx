'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { getTempOrder, updateTempOrder, getProducts, getZones, calculateFee } from '@/bm/lib/api';
import { useCart, isSupplement } from '@/bm/lib/cart';
import type { CategoryWithProducts, DeliveryZone, FeeCalculation, OrderTempRedis, Product, TempOrderItemDto, CartItem } from '@/bm/types';
import { formatPrice } from '@/bm/lib/format';
import SupplementPicker from '@/components/SupplementPicker';

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
        setError('Token manquant');
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

        // Clear cart first, then load order items
        clearCart();

        const allProducts: Product[] = productsData.flatMap((c) => c.products);
        const productMap = new Map(allProducts.map((p) => [p.id, p]));

        // First add non-supplement items, then supplements with their attachments
        const mainItems = order.items.filter((item) => {
          const product = productMap.get(item.productId);
          return product && !isSupplement(product);
        });

        const supplementItems = order.items.filter((item) => {
          const product = productMap.get(item.productId);
          return product && isSupplement(product);
        });

        // Add main items first
        for (const item of mainItems) {
          const product = productMap.get(item.productId);
          if (product) {
            addItem(product, item.quantity);
          }
        }

        // Then add supplements with attachment info from notes
        for (const item of supplementItems) {
          const product = productMap.get(item.productId);
          if (product) {
            // Try to find the attached burger from notes (format: "Pour [burger name]")
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
        setError('Commande introuvable ou expirée');
      } finally {
        setLoading(false);
      }
    }
    loadOrder();
  }, [token, addItem, setZone, clearCart]);

  // Scroll spy
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
      setToastMessage('Ajoutez d\'abord un burger avant de choisir un supplément');
      return;
    }
    if (burgersInCart.length === 1) {
      addItem(product, 1, burgersInCart[0].product.id);
      return;
    }
    setPendingSupplement(product);
    setSupplementPickerOpen(true);
  }, [items, addItem]);

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

  // Group items for display
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-bm-primary border-t-transparent" />
      </div>
    );
  }

  if (error && !existingOrder) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <svg className="mb-4 h-16 w-16 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
        <p className="text-lg font-semibold text-stone-700">{error}</p>
        <Link href="/menu" className="btn-bm btn-bm-primary btn-bm-lg mt-4">
          Retour au menu
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-bm-bg">
      <header className="sticky top-0 z-40 bg-bm-primary px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/menu" className="text-stone-900" aria-label="Retour">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-stone-900">Modifier la commande</h1>
            <p className="text-xs text-stone-700">Modifiez vos articles et confirmez</p>
          </div>
        </div>
      </header>

      {/* Cart summary */}
      {items.length > 0 && (
        <div className="border-b border-stone-200 bg-white px-4 py-3">
          <h2 className="mb-2 text-sm font-semibold text-stone-700">Votre panier ({totalItems})</h2>
          <div className="space-y-1">
            {groupedItems.map((group) => (
              <div key={group.item.product.id}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-stone-800">
                    {group.item.quantity}× {group.item.product.name}
                  </span>
                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      onClick={() =>
                        group.item.quantity <= 1
                          ? removeItem(group.item.product.id)
                          : updateQuantity(group.item.product.id, group.item.quantity - 1)
                      }
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 text-xs font-bold text-stone-600"
                    >
                      {group.item.quantity <= 1 ? '×' : '−'}
                    </button>
                    <button
                      onClick={() => updateQuantity(group.item.product.id, group.item.quantity + 1)}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 text-xs font-bold text-stone-600"
                    >
                      +
                    </button>
                  </div>
                </div>
                {group.supplements.map((supp) => (
                  <div key={`${supp.product.id}-${supp.attachedToProductId}`} className="flex items-center gap-2 pl-4">
                    <span className="text-xs text-stone-500">
                      ├ {supp.quantity}× {supp.product.name} (suppl.)
                    </span>
                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        onClick={() =>
                          supp.quantity <= 1
                            ? removeItem(supp.product.id)
                            : updateQuantity(supp.product.id, supp.quantity - 1)
                        }
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-100 text-[10px] font-bold text-stone-500"
                      >
                        {supp.quantity <= 1 ? '×' : '−'}
                      </button>
                      <button
                        onClick={() => updateQuantity(supp.product.id, supp.quantity + 1)}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-100 text-[10px] font-bold text-stone-500"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zone selector */}
      {zones.length > 0 && (
        <div className="border-b border-stone-200 bg-white px-4 py-3">
          <h2 className="mb-2 text-sm font-semibold text-stone-700">Zone de livraison</h2>
          <div className="flex flex-wrap gap-2">
            {zones.map((zone) => (
              <button
                key={zone.id}
                onClick={() => handleZoneChange(zone.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedZone?.id === zone.id
                    ? 'bg-bm-primary text-stone-900'
                    : 'bg-stone-100 text-stone-600'
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
        <div className="sticky top-[52px] z-30 backdrop-blur-sm border-b border-stone-100 bg-bm-bg/95">
          <div className="category-tabs">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => scrollToSection(category.id)}
                className={`category-tab ${
                  activeSection === category.id ? 'category-tab-active' : 'category-tab-inactive'
                }`}
              >
                <span className="mr-1">{CATEGORY_ICONS[category.name] || '🍽️'}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Products */}
      <div className="flex-1 pb-40 px-4 py-4 space-y-6">
        {categories.map((category) => {
          const sectionEl = (ref: HTMLElement | null) => { sectionRefs.current[category.id] = ref; };
          return (
            <section
              key={category.id}
              ref={sectionEl}
              id={`section-modify-${category.id}`}
            >
              <div className="category-section-header mb-3 flex items-center gap-2">
                <span className="text-xl">{CATEGORY_ICONS[category.name] || '🍽️'}</span>
                <h2 className="text-lg font-extrabold text-stone-800 tracking-tight">
                  {category.name}
                </h2>
              </div>

              <div className="space-y-3">
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
                    <div key={product.id} className="menu-product-card flex gap-3">
                      <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-bm-primary-50 to-bm-accent-50">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <span className="text-3xl">{CATEGORY_ICONS[category.name] || '🍽️'}</span>
                        )}
                        {totalQuantity > 0 && (
                          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-bm-primary text-[10px] font-bold text-stone-900 shadow-sm">
                            {totalQuantity}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col justify-between py-0.5 min-w-0">
                        <div>
                          <div className="mb-1 flex items-start justify-between gap-2">
                            <h3 className="text-sm font-bold text-stone-800 leading-tight">{product.name}</h3>
                            {isSupplement(product) && (
                              <span className="shrink-0 rounded-full bg-bm-accent-50 px-2 py-0.5 text-[10px] font-semibold text-bm-accent-500 uppercase tracking-wide">
                                Suppl.
                              </span>
                            )}
                          </div>
                          {product.description && (
                            <p className="mb-1 text-xs text-stone-500 leading-snug line-clamp-2">{product.description}</p>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-base font-bold text-bm-primary">{formatPrice(product.price)}</span>
                          {totalQuantity > 0 ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={handleDecrease}
                                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-bm-primary text-bm-primary transition-colors active:bg-bm-primary-50"
                                aria-label="Diminuer"
                              >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  {primaryCartItem && primaryCartItem.quantity <= 1 ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                  ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                                  )}
                                </svg>
                              </button>
                              <span className="w-6 text-center text-xs font-bold text-stone-800">{totalQuantity}</span>
                              <button
                                onClick={() => addItem(product)}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-bm-primary text-stone-900 shadow-sm transition-transform active:scale-90"
                                aria-label="Augmenter"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={handleAdd}
                              className="flex h-8 items-center gap-1 rounded-full bg-bm-primary px-3 text-xs font-semibold text-stone-900 shadow-sm transition-transform active:scale-90"
                              aria-label={`Ajouter ${product.name}`}
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                              Ajouter
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
        <div className="fixed left-4 right-4 top-20 z-50 animate-in slide-in-from-top-2 rounded-xl bg-stone-800 px-4 py-3 text-sm font-medium text-white shadow-lg">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 shrink-0 text-bm-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            {toastMessage}
          </div>
        </div>
      )}

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-stone-200 bg-white px-4 py-3 safe-bottom">
        <div className="mx-auto max-w-lg">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-stone-600">
              {totalItems} article{totalItems > 1 ? 's' : ''} + livraison
            </span>
            <span className="text-lg font-bold text-bm-primary">{formatPrice(total)}</span>
          </div>
          {error && <p className="mb-2 text-xs text-bm-secondary">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={submitting || items.length === 0 || !selectedZone}
            className="btn-bm btn-bm-primary btn-bm-lg block w-full text-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-stone-900 border-t-transparent" />
                Modification...
              </span>
            ) : (
              'Confirmer la modification'
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
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-bm-primary border-t-transparent" />
        </div>
      }
    >
      <ModifyContent />
    </Suspense>
  );
}
