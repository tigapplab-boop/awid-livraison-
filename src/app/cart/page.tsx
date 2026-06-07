'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useCart } from '@/bm/lib/cart';
import { getZones, calculateFee } from '@/bm/lib/api';
import type { DeliveryZone, FeeCalculation, CartItem } from '@/bm/types';
import { formatPrice } from '@/bm/lib/format';

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

  return (
    <div
      className={`flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm border border-stone-100 ${
        isSupplement ? 'ml-4 border-l-4 border-l-bm-accent-300' : ''
      }`}
    >
      <div className={`flex shrink-0 items-center justify-center rounded-lg ${
        isSupplement ? 'h-10 w-10 bg-bm-accent-50' : 'h-14 w-14 bg-bm-primary-50'
      }`}>
        {item.product.image ? (
          <img
            src={item.product.image}
            alt={item.product.name}
            className={`${isSupplement ? 'h-8 w-8' : 'h-12 w-12'} rounded-lg object-cover`}
          />
        ) : (
          <span className={isSupplement ? 'text-lg' : 'text-2xl'}>
            {isSupplement ? '➕' : '🍔'}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className={`font-semibold text-stone-800 truncate ${isSupplement ? 'text-sm' : 'text-sm'}`}>
            {item.product.name}
          </h3>
          {isSupplement && (
            <span className="shrink-0 rounded-full bg-bm-accent-50 px-1.5 py-0.5 text-[9px] font-semibold text-bm-accent-500 uppercase tracking-wide">
              Suppl.
            </span>
          )}
        </div>
        {isSupplement && burgerName && (
          <p className="text-xs text-stone-400 truncate">
            Pour {burgerName}
          </p>
        )}
        <p className={`font-bold text-bm-primary ${isSupplement ? 'text-xs' : 'text-sm'}`}>
          {formatPrice(item.product.price * item.quantity)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() =>
            item.quantity <= 1
              ? removeItem(item.product.id)
              : updateQuantity(item.product.id, item.quantity - 1)
          }
          className="qty-btn text-lg"
          aria-label="Diminuer quantité"
        >
          {item.quantity <= 1 ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          ) : (
            '−'
          )}
        </button>
        <span className="w-8 text-center text-sm font-bold text-stone-800">
          {item.quantity}
        </span>
        <button
          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
          className="qty-btn text-lg"
          aria-label="Augmenter quantité"
        >
          +
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

  // Group items: burgers first, then supplements attached to them, then standalone items
  const groupedItems = (() => {
    const mainItems = items.filter((item) => !item.attachedToProductId);
    const standaloneSupplements = items.filter(
      (item) => item.attachedToProductId === undefined
    );

    // For each main item, find its supplements
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

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-bm-bg">
        <header className="sticky top-0 z-40 bg-bm-primary px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/menu" className="text-stone-900" aria-label="Retour au menu">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <h1 className="text-lg font-bold text-stone-900">Mon Panier</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <svg
            className="mb-4 h-24 w-24 text-stone-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
            />
          </svg>
          <p className="text-lg font-semibold text-stone-700">Votre panier est vide</p>
          <p className="mt-1 text-sm text-stone-500">Ajoutez des produits depuis le menu</p>
          <Link href="/menu" className="btn-bm btn-bm-primary btn-bm-lg mt-6">
            Voir le menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-bm-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-bm-primary px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/menu" className="text-stone-900" aria-label="Retour au menu">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-stone-900">Mon Panier ({totalItems})</h1>
        </div>
      </header>

      {/* Cart Items - Grouped */}
      <div className="flex-1 px-4 py-3">
        <div className="space-y-2">
          {groupedItems.map((group) => {
            if (group.type === 'main') {
              return (
                <div key={group.item.product.id} className="space-y-1.5">
                  <CartItemRow
                    item={group.item}
                    isSupplement={false}
                  />
                  {group.supplements.map((supp) => (
                    <CartItemRow
                      key={`${supp.product.id}-${supp.attachedToProductId}`}
                      item={supp}
                      isSupplement={true}
                      burgerName={group.item.product.name}
                    />
                  ))}
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
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-stone-700 uppercase tracking-wider">
            Zone de livraison
          </h2>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="skeleton-bm h-14 rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-bm-secondary">{error}</p>
          ) : zones.length === 0 ? (
            <p className="text-sm text-stone-500">Aucune zone disponible</p>
          ) : (
            <div className="space-y-2">
              {zones.map((zone) => (
                <button
                  key={zone.id}
                  onClick={() => handleZoneChange(zone.id)}
                  className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 transition-all ${
                    selectedZone?.id === zone.id
                      ? 'border-bm-primary bg-bm-primary-50'
                      : 'border-stone-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-5 w-5 rounded-full border-2 ${
                        selectedZone?.id === zone.id
                          ? 'border-bm-primary bg-bm-primary'
                          : 'border-stone-300'
                      }`}
                    />
                    <span className="font-medium text-stone-800">{zone.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-stone-600">
                    {calculatingFee ? '...' : formatPrice(zone.dayFee)}
                    {zone.nightFee !== zone.dayFee && (
                      <span className="ml-1 text-xs text-stone-400">
                        / nuit: {formatPrice(zone.nightFee)}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="mt-6 rounded-xl bg-white p-4 shadow-sm border border-stone-100">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-stone-600">
              <span>Sous-total ({totalItems} article{totalItems > 1 ? 's' : ''})</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {selectedZone && (
              <div className="flex justify-between text-sm text-stone-600">
                <span>
                  Livraison ({selectedZone.name})
                  {isNightDelivery && (
                    <span className="ml-1 text-xs text-bm-accent-500">🌙 Nuit</span>
                  )}
                </span>
                <span>{formatPrice(deliveryFee)}</span>
              </div>
            )}
            <div className="border-t border-stone-100 pt-2">
              <div className="flex justify-between text-base font-bold text-stone-900">
                <span>Total</span>
                <span className="text-bm-primary">{formatPrice(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action */}
      <div className="sticky bottom-0 border-t border-stone-200 bg-white px-4 py-4 safe-bottom">
        <Link
          href={selectedZone ? '/checkout' : '#'}
          className={`btn-bm btn-bm-primary btn-bm-lg block w-full text-center ${
            !selectedZone ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          onClick={(e) => {
            if (!selectedZone) {
              e.preventDefault();
            }
          }}
        >
          {selectedZone ? 'Commander' : 'Sélectionnez une zone'}
        </Link>
      </div>
    </div>
  );
}
