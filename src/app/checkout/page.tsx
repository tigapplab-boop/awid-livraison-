'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCart } from '@/bm/lib/cart';
import { checkPendingOrder, createTempOrder, cancelAndCreate } from '@/bm/lib/api';
import type { OrderTempRedis, CreateTempOrderDto, CartItem } from '@/bm/types';
import { formatPrice } from '@/bm/lib/format';

const checkoutSchema = z.object({
  clientName: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom est trop long'),
  clientPhone: z
    .string()
    .regex(/^0[5-7][0-9]{8}$/, 'Numéro de téléphone algérien invalide (format: 05XXXXXXXX)'),
  clientAddress: z
    .string()
    .min(10, 'L\'adresse doit contenir au moins 10 caractères')
    .max(500, 'L\'adresse est trop longue'),
  notes: z.string().max(500, 'Les notes sont trop longues').optional(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

interface PendingModalData {
  existingOrder: OrderTempRedis;
  formData: CheckoutFormData;
}

export default function CheckoutPage() {
  const router = useRouter();
  const {
    items,
    selectedZone,
    deliveryFee,
    isNightDelivery,
    subtotal,
    total,
    clearCart,
  } = useCart();

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingModal, setPendingModal] = useState<PendingModalData | null>(null);
  const [pendingAction, setPendingAction] = useState<'modify' | 'create' | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      clientName: '',
      clientPhone: '',
      clientAddress: '',
      notes: '',
    },
  });

  // Build items array with notes for supplements
  const buildOrderItems = useCallback((cartItems: CartItem[]) => {
    return cartItems.map((item) => {
      const notes = item.attachedToProductId
        ? `Pour ${cartItems.find((i) => i.product.id === item.attachedToProductId)?.product.name || 'burger'}`
        : undefined;
      return {
        productId: item.product.id,
        quantity: item.quantity,
        notes,
      };
    });
  }, []);

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

  const createNewOrder = useCallback(
    async (data: CheckoutFormData) => {
      const dto: CreateTempOrderDto = {
        clientPhone: data.clientPhone,
        clientName: data.clientName,
        clientAddress: data.clientAddress,
        deliveryZone: selectedZone!.id,
        items: buildOrderItems(items),
        notes: data.notes || undefined,
      };

      const result = await createTempOrder(dto);

      if (result.action === 'CREATED' && result.tempToken) {
        clearCart();
        router.push(`/waiting?token=${result.tempToken}`);
      } else if (result.action === 'EXISTING_PENDING' && result.existingOrder) {
        setPendingModal({
          existingOrder: result.existingOrder,
          formData: data,
        });
      }
    },
    [selectedZone, items, router, buildOrderItems],
  );

  const onSubmit = useCallback(
    async (data: CheckoutFormData) => {
      if (!selectedZone || items.length === 0) return;

      setSubmitting(true);
      setSubmitError(null);

      try {
        const pendingCheck = await checkPendingOrder(data.clientPhone);

        if (pendingCheck.hasPending && pendingCheck.order) {
          setPendingModal({
            existingOrder: pendingCheck.order,
            formData: data,
          });
          setSubmitting(false);
          return;
        }

        await createNewOrder(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur lors de la commande';
        setSubmitError(message);
        setSubmitting(false);
      }
    },
    [selectedZone, items, createNewOrder],
  );

  const handleModifyExisting = useCallback(() => {
    if (!pendingModal) return;
    setPendingAction('modify');
    router.push(`/modify?token=${pendingModal.existingOrder.tempToken}`);
  }, [pendingModal, router]);

  const handleCancelAndCreate = useCallback(async () => {
    if (!pendingModal) return;
    setPendingAction('create');

    try {
      const dto: CreateTempOrderDto = {
        clientPhone: pendingModal.formData.clientPhone,
        clientName: pendingModal.formData.clientName,
        clientAddress: pendingModal.formData.clientAddress,
        deliveryZone: selectedZone!.id,
        items: buildOrderItems(items),
        notes: pendingModal.formData.notes || undefined,
      };

      const result = await cancelAndCreate(
        pendingModal.existingOrder.tempToken,
        dto,
      );

      setPendingModal(null);
      clearCart();
      router.push(`/waiting?token=${result.tempToken}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la création';
      setSubmitError(message);
      setPendingAction(null);
    }
  }, [pendingModal, selectedZone, items, router, buildOrderItems]);

  if (!selectedZone || items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 bg-bm-primary px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/cart" className="text-stone-900" aria-label="Retour au panier">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <h1 className="text-lg font-bold text-stone-900">Commander</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <p className="text-stone-500">Votre panier est vide ou aucune zone sélectionnée</p>
          <Link href="/menu" className="btn-bm btn-bm-primary btn-bm-lg mt-4">
            Voir le menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 bg-bm-primary px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/cart" className="text-stone-900" aria-label="Retour au panier">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-stone-900">Commander</h1>
        </div>
      </header>

      <div className="flex-1 px-4 py-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="clientName" className="mb-1.5 block text-sm font-semibold text-stone-700">
              Nom complet
            </label>
            <input
              id="clientName"
              type="text"
              placeholder="Votre nom"
              className={`input-bm ${errors.clientName ? 'input-bm-error' : ''}`}
              {...register('clientName')}
            />
            {errors.clientName && (
              <p className="mt-1 text-xs text-bm-secondary">{errors.clientName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="clientPhone" className="mb-1.5 block text-sm font-semibold text-stone-700">
              Téléphone
            </label>
            <input
              id="clientPhone"
              type="tel"
              placeholder="05XXXXXXXX"
              inputMode="numeric"
              className={`input-bm ${errors.clientPhone ? 'input-bm-error' : ''}`}
              {...register('clientPhone')}
            />
            {errors.clientPhone && (
              <p className="mt-1 text-xs text-bm-secondary">{errors.clientPhone.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="clientAddress" className="mb-1.5 block text-sm font-semibold text-stone-700">
              Adresse de livraison
            </label>
            <textarea
              id="clientAddress"
              placeholder="Votre adresse complète (rue, quartier, immeuble...)"
              rows={3}
              className={`input-bm resize-none ${errors.clientAddress ? 'input-bm-error' : ''}`}
              {...register('clientAddress')}
            />
            {errors.clientAddress && (
              <p className="mt-1 text-xs text-bm-secondary">{errors.clientAddress.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="notes" className="mb-1.5 block text-sm font-semibold text-stone-700">
              Notes (optionnel)
            </label>
            <input
              id="notes"
              type="text"
              placeholder="Instructions spéciales..."
              className={`input-bm ${errors.notes ? 'input-bm-error' : ''}`}
              {...register('notes')}
            />
            {errors.notes && (
              <p className="mt-1 text-xs text-bm-secondary">{errors.notes.message}</p>
            )}
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm border border-stone-100">
            <h3 className="mb-3 text-sm font-semibold text-stone-700 uppercase tracking-wider">
              Récapitulatif
            </h3>
            <div className="space-y-2 mb-3">
              {groupedItems.map((group) => (
                <div key={group.item.product.id}>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-800 font-medium">
                      {group.item.quantity}× {group.item.product.name}
                    </span>
                    <span className="text-stone-800 font-medium">
                      {formatPrice(group.item.product.price * group.item.quantity)}
                    </span>
                  </div>
                  {group.supplements.map((supp) => (
                    <div
                      key={`${supp.product.id}-${supp.attachedToProductId}`}
                      className="flex justify-between text-sm pl-4 mt-0.5"
                    >
                      <span className="text-stone-500">
                        <span className="text-bm-accent-500 mr-1">├</span>
                        {supp.quantity}× {supp.product.name}
                        <span className="text-stone-400 ml-1">(suppl.)</span>
                      </span>
                      <span className="text-stone-500">
                        {formatPrice(supp.product.price * supp.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="border-t border-stone-100 pt-2 space-y-1">
              <div className="flex justify-between text-sm text-stone-600">
                <span>Sous-total</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-stone-600">
                <span>
                  Livraison ({selectedZone.name})
                  {isNightDelivery && <span className="ml-1 text-xs text-bm-accent-500">🌙</span>}
                </span>
                <span>{formatPrice(deliveryFee)}</span>
              </div>
              <div className="border-t border-stone-100 pt-2">
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="text-bm-primary">{formatPrice(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {submitError && (
            <div className="rounded-xl bg-bm-secondary-50 border border-bm-secondary-100 p-3">
              <p className="text-sm text-bm-secondary">{submitError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-bm btn-bm-primary btn-bm-lg block w-full text-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-stone-900 border-t-transparent" />
                Envoi en cours...
              </span>
            ) : (
              `Confirmer - ${formatPrice(total)}`
            )}
          </button>
        </form>
      </div>

      {pendingModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-2xl safe-bottom">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bm-accent-50">
                <svg className="h-6 w-6 text-bm-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-800">Commande en attente</h3>
                <p className="text-sm text-stone-500">Vous avez déjà une commande en cours</p>
              </div>
            </div>

            <div className="mb-4 rounded-xl bg-stone-50 p-3">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-500">Statut</span>
                  <span className="font-medium text-bm-accent-500">
                    {pendingModal.existingOrder.status === 'CALLING'
                      ? 'Appel en cours'
                      : 'En attente'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Total</span>
                  <span className="font-medium">
                    {formatPrice(pendingModal.existingOrder.total)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Articles</span>
                  <span className="font-medium">
                    {pendingModal.existingOrder.items
                      .map((i) => `${i.quantity}× ${i.name}`)
                      .join(', ')}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleModifyExisting}
                className="btn-bm btn-bm-outline btn-bm-lg block w-full text-center"
              >
                Modifier cette commande
              </button>
              <button
                onClick={handleCancelAndCreate}
                disabled={pendingAction === 'create'}
                className="btn-bm btn-bm-secondary btn-bm-lg block w-full text-center disabled:opacity-50"
              >
                {pendingAction === 'create' ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Création...
                  </span>
                ) : (
                  'Créer une nouvelle commande'
                )}
              </button>
              <button
                onClick={() => setPendingModal(null)}
                className="btn-bm btn-bm-ghost block w-full text-center"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
