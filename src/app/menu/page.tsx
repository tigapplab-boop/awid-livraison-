"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getProducts } from '@/bm/lib/api';
import { useCart, isSupplement, registerSupplementCategoryIds } from '@/bm/lib/cart';
import type { CategoryWithProducts, Product } from '@/bm/types';
import SupplementPicker from '@/components/SupplementPicker';

import { ProductCard } from '@/components/menu/ProductCard';
import { CategoryTabs } from '@/components/menu/CategoryTabs';
import { PromoBanner } from '@/components/menu/PromoBanner';
import { useLocale } from '@/lib/locale';
import { t } from '@/lib/i18n';

// Category names that are considered "supplement" categories
const SUPPLEMENT_CATEGORY_NAMES = ['Suppléments', 'Supplements', 'suppléments', 'supplements'];

function MenuSkeleton() {
  return (
    <div className="animate-pulse px-4 py-4 space-y-8">
      {Array.from({ length: 3 }).map((_, catIdx) => (
        <div key={catIdx}>
          <div className="skeleton-bm mb-4 h-8 w-48 rounded-lg" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white overflow-hidden shadow-sm">
                <div className="skeleton-bm aspect-[4/3] w-full" />
                <div className="p-3">
                  <div className="skeleton-bm mb-2 h-4 w-3/4 rounded" />
                  <div className="skeleton-bm mb-3 h-3 w-1/2 rounded" />
                  <div className="flex justify-between mt-auto">
                    <div className="skeleton-bm h-5 w-16 rounded" />
                    <div className="skeleton-bm h-9 w-9 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <MenuContent />
    </Suspense>
  );
}

function MenuContent() {
  const searchParams = useSearchParams();
  const orderConfirmed = searchParams.get('orderConfirmed');
  const [categories, setCategories] = useState<CategoryWithProducts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [supplementPickerOpen, setSupplementPickerOpen] = useState(false);
  const [pendingSupplement, setPendingSupplement] = useState<Product | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [orderBannerInfo, setOrderBannerInfo] = useState<{ orderId: string; orderNumber: string } | null>(null);
  const [showOrderBanner, setShowOrderBanner] = useState(false);
  const [animatingProduct, setAnimatingProduct] = useState<string | null>(null);
  const [showCartBar, setShowCartBar] = useState(false);
  
  const { totalItems, addItem, items, subtotal } = useCart();
  const { locale, isRTL, isMounted } = useLocale();

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const isScrollingRef = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProducts();
      setCategories(data);
      if (data.length > 0) {
        setActiveSection(data[0].id);
        // Register supplement category IDs for the isSupplement() function
        const supplementCatIds = data
          .filter((c) => SUPPLEMENT_CATEGORY_NAMES.includes(c.name))
          .map((c) => c.id);
        registerSupplementCategoryIds(supplementCatIds);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de chargement';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Scroll spy: update active section based on scroll position
  useEffect(() => {
    if (loading || categories.length === 0) return;

    const handleScroll = () => {
      if (isScrollingRef.current) return;

      const scrollY = window.scrollY + 140;

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

  // Show order confirmed banner
  useEffect(() => {
    if (orderConfirmed === '1') {
      try {
        const info = localStorage.getItem('bm_orderConfirmed');
        if (info) {
          const parsed = JSON.parse(info);
          setOrderBannerInfo(parsed);
        }
      } catch {}
      setShowOrderBanner(true);
      const timer = setTimeout(() => setShowOrderBanner(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [orderConfirmed]);

  // Auto-hide toast
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Show/Hide cart bar
  useEffect(() => {
    setShowCartBar(totalItems > 0);
  }, [totalItems]);

  // Validate existing order on mount
  useEffect(() => {
    async function validateOrder() {
      try {
        const info = localStorage.getItem('bm_orderConfirmed');
        if (!info) return;
        const parsed = JSON.parse(info);
        if (!parsed?.orderId) return;
        const res = await fetch(`/api/orders/${parsed.orderId}`);
        if (!res.ok) {
          localStorage.removeItem('bm_orderConfirmed');
          setOrderBannerInfo(null);
        } else {
          setOrderBannerInfo(parsed);
        }
      } catch {}
    }
    validateOrder();
  }, []);

  const scrollToSection = (categoryId: string) => {
    const el = sectionRefs.current[categoryId];
    if (!el) return;

    isScrollingRef.current = true;
    setActiveSection(categoryId);

    const top = el.offsetTop - 130;
    window.scrollTo({ top, behavior: 'smooth' });

    setTimeout(() => {
      isScrollingRef.current = false;
    }, 800);
  };

  const handleAddProduct = (productId: string) => {
    const product = categories.flatMap(c => c.products).find(p => p.id === productId);
    if (!product) return;

    // Haptic feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Animation
    setAnimatingProduct(productId);
    setTimeout(() => setAnimatingProduct(null), 300);

    if (isSupplement(product)) {
      handleAddSupplement(product);
    } else {
      addItem(product);
    }
  };

  const handleAddSupplement = (product: Product) => {
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
  };

  const handleSupplementSelect = (attachedToProductId: string) => {
    if (pendingSupplement) {
      addItem(pendingSupplement, 1, attachedToProductId);
    }
    setPendingSupplement(null);
  };

  const handleSupplementSkip = () => {
    if (pendingSupplement) {
      addItem(pendingSupplement, 1);
    }
    setPendingSupplement(null);
  };

  const getProductQuantity = (productId: string) => {
    return items.filter(i => i.product.id === productId).reduce((sum, i) => sum + i.quantity, 0);
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-bm-bg px-4 pb-2 pt-3">
        <div className="flex items-center gap-3 py-1">
          <div className="w-9 h-9 bg-bm-primary rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-stone-900 font-extrabold text-xs">BM</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-stone-900 leading-none">
              Burger Minute
            </h1>
            <p className="text-[11px] text-stone-500 font-medium mt-0.5">
              {t('menu.title', locale)}
            </p>
          </div>
        </div>
      </header>

      {/* Category Quick Nav */}
      {!loading && categories.length > 0 && (
        <CategoryTabs 
          categories={categories}
          activeCategory={activeSection || categories[0]?.id}
          onSelect={scrollToSection}
          locale={locale}
        />
      )}

      {/* Promo Banner */}
      {!loading && categories.length > 0 && (
        <PromoBanner locale={locale} />
      )}

      {/* Content - All Categories */}
      <div className="flex-1">
        {loading ? (
          <MenuSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center px-6 py-16">
            <svg
              className="mb-4 h-16 w-16 text-stone-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
            <p className="mb-2 text-lg font-semibold text-stone-700">Erreur de chargement</p>
            <p className="mb-6 text-sm text-stone-500 text-center">{error}</p>
            <button onClick={fetchData} className="btn-bm btn-bm-primary btn-bm-lg">
              Réessayer
            </button>
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16">
            <svg
              className="mb-4 h-16 w-16 text-stone-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0L3 16.5m15-3.379a48.474 48.474 0 0 0-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 0 1 3 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 0 1 6 13.12"
              />
            </svg>
            <p className="text-lg font-semibold text-stone-700">Aucun produit disponible</p>
            <p className="mt-1 text-sm text-stone-500">Revenez plus tard</p>
          </div>
        ) : (
          <div className="px-3 sm:px-4 py-2 space-y-6">
            {categories.map((category) => (
              <section
                key={category.id}
                ref={(el) => { sectionRefs.current[category.id] = el; }}
                id={`section-${category.id}`}
              >
                {/* Section Header */}
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-lg font-bold text-stone-800 tracking-tight">
                    {isRTL ? category.nameAr || category.name : category.name}
                  </h2>
                  <span className="text-xs font-medium text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                    {category.products.length}
                  </span>
                </div>

                {/* Products Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {category.products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product as any}
                      onAdd={handleAddProduct}
                      quantityInCart={getProductQuantity(product.id)}
                      locale={locale}
                      animatingProduct={animatingProduct}
                    />
                  ))}
                  {category.products.length === 0 && (
                    <p className="py-6 text-center text-sm text-stone-400 col-span-full">
                      Aucun produit dans cette catégorie
                    </p>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Floating Cart Bar */}
      <div className={`
        fixed bottom-0 left-0 right-0 p-4 z-50
        transition-transform duration-300 ease-out safe-area-bottom
        ${showCartBar ? 'translate-y-0' : 'translate-y-[150%]'}
      `}>
        <div className={`bg-[#1A1A1A] text-white rounded-2xl p-4 flex items-center justify-between shadow-2xl ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="relative">
              <span className="text-2xl drop-shadow-md">🛒</span>
              {totalItems > 0 && (
                <span className={`absolute -top-1 ${isRTL ? '-left-1' : '-right-1'} bg-bm-primary text-stone-900 text-[10px] w-[18px] h-[18px] rounded-full flex items-center justify-center font-bold shadow-sm`}>
                  {totalItems}
                </span>
              )}
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-xs font-medium text-stone-400">
                {totalItems} {t('menu.items', locale)}
              </p>
              <p className="text-base font-bold text-white">
                {(subtotal / 100).toLocaleString()} <span className="text-[10px] text-stone-400">DA</span>
              </p>
            </div>
          </div>
          <Link href="/cart" className="bg-bm-primary text-stone-900 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#FF8A00] active:scale-95 transition-all shadow-sm">
            {t('menu.viewCart', locale)}
          </Link>
        </div>
      </div>

      {/* Order Confirmed Banner */}
      {showOrderBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#00C853] text-white shadow-lg animate-in slide-in-from-top-4 safe-area-top">
          <div className={`mx-auto max-w-lg px-4 py-3 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-sm font-bold">{isRTL ? 'تم تأكيد الطلب!' : 'Commande acceptée !'}</p>
                {orderBannerInfo?.orderNumber && (
                  <p className="text-[11px] text-white/90 font-medium">N° {orderBannerInfo.orderNumber}</p>
                )}
              </div>
            </div>
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {orderBannerInfo?.orderId && (
                <Link
                  href={`/order/${orderBannerInfo.orderId}`}
                  className="text-xs font-semibold bg-white/20 px-3 py-1.5 rounded-full hover:bg-white/30 transition-colors"
                >
                  {isRTL ? '← تتبع' : 'Suivre →'}
                </Link>
              )}
              <button
                onClick={() => setShowOrderBanner(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed left-4 right-4 top-16 z-50 animate-in slide-in-from-top-2 rounded-xl bg-[#1A1A1A] px-4 py-3 text-sm font-medium text-white shadow-xl">
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <svg className="h-5 w-5 shrink-0 text-bm-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            {toastMessage}
          </div>
        </div>
      )}

      {/* Footer link */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-stone-100 bg-[#F8F5F0]/90 backdrop-blur-md safe-area-bottom z-40">
        <div className="mx-auto max-w-lg px-4 py-2 text-center">
          <Link
            href="/login"
            className="text-[10px] font-medium text-stone-400 hover:text-stone-600 transition-colors uppercase tracking-wider"
          >
            Espace Livreur / Admin
          </Link>
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
