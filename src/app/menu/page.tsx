"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getProducts } from '@/bm/lib/api';
import { useCart, isSupplement, registerSupplementCategoryIds } from '@/bm/lib/cart';
import type { CategoryWithProducts, Product } from '@/bm/types';
import { formatPrice } from '@/bm/lib/format';
import SupplementPicker from '@/components/SupplementPicker';

// Category icons mapping
const CATEGORY_ICONS: Record<string, string> = {
  'Nos Burgers': '🍔',
  'Suppléments': '➕',
  'Frites': '🍟',
  'Nos Boissons': '🥤',
};

// Category names that are considered "supplement" categories
const SUPPLEMENT_CATEGORY_NAMES = ['Suppléments', 'Supplements', 'suppléments', 'supplements'];

function ProductCard({
  product,
  categoryName,
  onAddSupplement,
}: {
  product: Product;
  categoryName: string;
  onAddSupplement: (product: Product) => void;
}) {
  const { addItem, removeItem, updateQuantity, items } = useCart();

  // Find all cart items for this product
  const cartItemsForProduct = items.filter((i) => i.product.id === product.id);
  const totalQuantity = cartItemsForProduct.reduce((sum, i) => sum + i.quantity, 0);
  const primaryCartItem = cartItemsForProduct.find((i) => !i.attachedToProductId) || cartItemsForProduct[0];

  const handleAdd = () => {
    if (isSupplement(product)) {
      onAddSupplement(product);
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

  const handleIncrease = () => {
    addItem(product);
  };

  return (
    <div className="menu-product-card">
      {/* Image Section - Full width proportional display */}
      <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-bm-primary-50 to-bm-primary-100 overflow-hidden">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <span className="text-6xl sm:text-7xl opacity-80">
              {CATEGORY_ICONS[categoryName] || '🍽️'}
            </span>
          </div>
        )}
        {totalQuantity > 0 && (
          <span className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-bm-secondary text-[11px] font-bold text-white shadow-md">
            {totalQuantity}
          </span>
        )}
        {isSupplement(product) && (
          <span className="absolute top-2 left-2 shrink-0 rounded-full bg-bm-accent-500 px-2.5 py-0.5 text-[10px] font-semibold text-white uppercase tracking-wide shadow-sm">
            Suppl.
          </span>
        )}
      </div>

      {/* Info Section */}
      <div className="p-3 sm:p-4">
        <div className="mb-2">
          <h3 className="text-base font-bold text-stone-800 leading-tight mb-1">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-sm text-stone-500 leading-snug line-clamp-2">
              {product.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="text-lg font-extrabold text-bm-primary-700">
            {formatPrice(product.price)}
          </span>

          {totalQuantity > 0 ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDecrease}
                className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-bm-primary text-bm-primary-700 transition-colors active:bg-bm-primary-50"
                aria-label="Diminuer"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  {primaryCartItem && primaryCartItem.quantity <= 1 ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                  )}
                </svg>
              </button>
              <span className="w-8 text-center text-sm font-bold text-stone-800">
                {totalQuantity}
              </span>
              <button
                onClick={handleIncrease}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-bm-primary text-bm-primary-700 shadow-sm transition-transform active:scale-90"
                aria-label="Augmenter"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              className="flex h-10 items-center gap-1.5 rounded-full bg-bm-primary px-5 text-sm font-bold text-bm-primary-700 shadow-sm transition-transform active:scale-90"
              aria-label={`Ajouter ${product.name}`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Ajouter
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuSkeleton() {
  return (
    <div className="animate-pulse px-4 py-4 space-y-8">
      {Array.from({ length: 3 }).map((_, catIdx) => (
        <div key={catIdx}>
          <div className="skeleton-bm mb-4 h-8 w-48 rounded-lg" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-white overflow-hidden">
                <div className="skeleton-bm aspect-[4/3] w-full" />
                <div className="p-3">
                  <div className="skeleton-bm mb-2 h-4 w-3/4 rounded" />
                  <div className="skeleton-bm mb-3 h-3 w-1/2 rounded" />
                  <div className="flex justify-between">
                    <div className="skeleton-bm h-6 w-16 rounded" />
                    <div className="skeleton-bm h-9 w-24 rounded-full" />
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
  const { totalItems, addItem, items } = useCart();

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

  const handleAddSupplement = (product: Product) => {
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

  return (
    <div className="flex min-h-screen flex-col bg-bm-bg">
      {/* Header - Yellow background with dark text */}
      <header className="sticky top-0 z-40 bg-bm-primary px-4 pb-3 pt-3 shadow-sm">
        <div className="flex items-center justify-between py-2">
          <div>
            <h1 className="text-xl font-extrabold text-stone-900 tracking-tight">
              🍔 Burger Minute
            </h1>
            <p className="text-xs text-stone-700 font-medium">Commandez en ligne</p>
          </div>
        </div>
      </header>

      {/* Category Quick Nav */}
      {!loading && categories.length > 0 && (
        <div className="sticky top-[72px] z-30 bg-bm-bg/95 backdrop-blur-sm border-b border-stone-100">
          <div className="category-tabs">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => scrollToSection(category.id)}
                className={`category-tab ${
                  activeSection === category.id
                    ? 'category-tab-active'
                    : 'category-tab-inactive'
                }`}
              >
                <span className="mr-1">{CATEGORY_ICONS[category.name] || '🍽️'}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content - All Categories */}
      <div className="flex-1 pb-24">
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
          <div className="px-3 sm:px-4 py-4 space-y-8">
            {categories.map((category) => (
              <section
                key={category.id}
                ref={(el) => { sectionRefs.current[category.id] = el; }}
                id={`section-${category.id}`}
              >
                {/* Section Header */}
                <div className="category-section-header mb-3 flex items-center gap-2">
                  <span className="text-xl">{CATEGORY_ICONS[category.name] || '🍽️'}</span>
                  <h2 className="text-lg font-extrabold text-stone-800 tracking-tight">
                    {category.name}
                  </h2>
                  <span className="text-xs font-medium text-stone-400">
                    {category.products.length} article{category.products.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Products Grid - 2 columns on mobile, 3 on tablet, 4 on desktop */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {category.products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      categoryName={category.name}
                      onAddSupplement={handleAddSupplement}
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

      {/* Order Confirmed Banner */}
      {showOrderBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-green-500 text-white shadow-lg animate-in slide-in-from-top-4">
          <div className="mx-auto max-w-lg px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold">Commande acceptée !</p>
                {orderBannerInfo?.orderNumber && (
                  <p className="text-xs text-white/80">N° {orderBannerInfo.orderNumber}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {orderBannerInfo?.orderId && (
                <Link
                  href={`/order/${orderBannerInfo.orderId}`}
                  className="text-xs font-semibold bg-white/20 px-3 py-1.5 rounded-full hover:bg-white/30 transition-colors"
                >
                  Suivre →
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
        <div className="fixed left-4 right-4 top-20 z-50 animate-in slide-in-from-top-2 rounded-xl bg-stone-800 px-4 py-3 text-sm font-medium text-white shadow-lg">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 shrink-0 text-bm-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            {toastMessage}
          </div>
        </div>
      )}

      {/* Floating Cart Button */}
      {totalItems > 0 && (
        <Link href="/cart" className="cart-fab" aria-label={`Panier: ${totalItems} article${totalItems > 1 ? 's' : ''}`}>
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
            />
          </svg>
          <span className="cart-fab-badge">{totalItems}</span>
        </Link>
      )}

      {/* Footer link */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-stone-200 bg-white/90 backdrop-blur-sm safe-bottom">
        <div className="mx-auto max-w-lg px-4 py-2 text-center">
          <Link
            href="/login"
            className="text-xs text-stone-400 transition-colors hover:text-bm-primary-700"
          >
            Espace Livreur / Admin →
          </Link>
        </div>
      </div>

      {/* Active order indicator */}
      {!showOrderBanner && orderBannerInfo?.orderId && (
        <Link
          href={`/order/${orderBannerInfo.orderId}`}
          className="fixed top-2 right-2 z-30 flex items-center gap-1.5 bg-green-500 text-white rounded-full px-3 py-1.5 text-xs font-semibold shadow-lg hover:bg-green-600 transition-colors"
        >
          <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
          Commande en cours
        </Link>
      )}

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
