'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCart } from '@/bm/lib/cart';
import { checkPendingOrder, createTempOrder, cancelAndCreate } from '@/bm/lib/api';
import type { OrderTempRedis, CreateTempOrderDto, CartItem } from '@/bm/types';
import { formatPrice } from '@/bm/lib/format';
import { useLocale } from '@/lib/locale';
import { t } from '@/lib/i18n';
import { ChevronLeft, ChevronRight, Check, AlertCircle } from 'lucide-react';

const checkoutSchema = z.object({
  clientName: z.string().min(3, 'Minimum 3 caractères').max(100),
  clientPhone: z.string().regex(/^(\+213[567][0-9]{8}|0[567][0-9]{8})$/, 'Numéro invalide (05/06/07 ou +213)'),
  clientAddress: z.string().min(1, 'Adresse requise').max(500),
  notes: z.string().max(500).optional(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

interface PendingModalData {
  existingOrder: OrderTempRedis;
  formData: CheckoutFormData;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { locale, isRTL, isMounted } = useLocale();
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

  const buildOrderItems = useCallback((cartItems: CartItem[]) => {
    return cartItems.map((item) => {
      const notes = item.attachedToProductId
        ? `${t('cart.for', locale)} ${cartItems.find((i) => i.product.id === item.attachedToProductId)?.product.name || 'burger'}`
        : undefined;
      return {
        productId: item.product.id,
        quantity: item.quantity,
        notes,
      };
    });
  }, [locale]);

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
      // Normaliser le numéro: ajouter +213 si commence par 0
      let normalizedPhone = data.clientPhone;
      if (normalizedPhone.startsWith('0')) {
        normalizedPhone = '+213' + normalizedPhone.substring(1);
      }

      const dto: CreateTempOrderDto = {
        clientPhone: normalizedPhone,
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
    [selectedZone, items, router, buildOrderItems, clearCart],
  );

  const onSubmit = useCallback(
    async (data: CheckoutFormData) => {
      if (!selectedZone || items.length === 0) return;

      setSubmitting(true);
      setSubmitError(null);

      try {
        // Normaliser le numéro pour la vérification
        let normalizedPhone = data.clientPhone;
        if (normalizedPhone.startsWith('0')) {
          normalizedPhone = '+213' + normalizedPhone.substring(1);
        }

        const pendingCheck = await checkPendingOrder(normalizedPhone);

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
        const message = err instanceof Error ? err.message : 'Erreur';
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
      // Normaliser le numéro
      let normalizedPhone = pendingModal.formData.clientPhone;
      if (normalizedPhone.startsWith('0')) {
        normalizedPhone = '+213' + normalizedPhone.substring(1);
      }

      const dto: CreateTempOrderDto = {
        clientPhone: normalizedPhone,
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
      const message = err instanceof Error ? err.message : 'Erreur';
      setSubmitError(message);
      setPendingAction(null);
    }
  }, [pendingModal, selectedZone, items, router, buildOrderItems, clearCart]);

  if (!isMounted) return null;

  if (!selectedZone || items.length === 0) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-stone-50" dir={isRTL ? 'rtl' : 'ltr'}>
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-stone-200/50 px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/cart" className="w-10 h-10 flex items-center justify-center rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors">
              {isRTL ? <ChevronRight className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
            </Link>
            <h1 className="text-xl font-bold text-stone-900">{t('checkout.title', locale)}</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <p className="text-lg font-bold text-stone-700 text-center">{t('checkout.empty', locale)}</p>
          <Link href="/menu" className="btn-bm-lg btn-bm-primary mt-6">
            {t('checkout.backToMenu', locale)}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-stone-50" dir={isRTL ? 'rtl' : 'ltr'}>
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-stone-200/50 px-4 py-4">
        <div className="flex items-center gap-4">
          <Link href="/cart" className="w-10 h-10 flex items-center justify-center rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors">
            {isRTL ? <ChevronRight className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
          </Link>
          <h1 className="text-xl font-bold text-stone-900">{t('checkout.title', locale)}</h1>
        </div>
      </header>

      <div className="flex-1 px-4 py-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <label htmlFor="clientName" className="mb-1.5 block text-sm font-bold text-stone-700">
                {t('checkout.fullName', locale)} <span className="text-red-500">*</span>
              </label>
              <input
                id="clientName"
                type="text"
                placeholder={t('checkout.fullName', locale)}
                className={`input-bm px-4 w-full h-14 bg-white border-2 rounded-2xl focus:border-bm-primary focus:ring-4 focus:ring-bm-primary/10 transition-all ${errors.clientName ? 'border-red-500' : 'border-stone-100'}`}
                {...register('clientName')}
              />
              {errors.clientName && (
                <p className="mt-1.5 text-xs font-medium text-red-500">{errors.clientName.message || t('checkout.errors.name', locale)}</p>
              )}
            </div>

            <div className="relative">
              <label htmlFor="clientPhone" className="mb-1.5 block text-sm font-bold text-stone-700">
                {t('checkout.phone', locale)} <span className="text-red-500">*</span>
              </label>
              <input
                id="clientPhone"
                type="tel"
                placeholder="+213 5XXXXXXXX ou 05XXXXXXXX"
                inputMode="numeric"
                maxLength={16}
                dir="ltr"
                className={`input-bm px-4 w-full h-14 bg-white border-2 rounded-2xl focus:border-bm-primary focus:ring-4 focus:ring-bm-primary/10 transition-all text-left ${errors.clientPhone ? 'border-red-500' : 'border-stone-100'}`}
                {...register('clientPhone')}
              />
              {errors.clientPhone && (
                <p className="mt-1.5 text-xs font-medium text-red-500">{errors.clientPhone.message || t('checkout.errors.phone', locale)}</p>
              )}
            </div>

            <div className="relative">
              <label htmlFor="clientAddress" className="mb-1.5 block text-sm font-bold text-stone-700">
                {t('checkout.address', locale)} <span className="text-red-500">*</span>
              </label>
              <textarea
                id="clientAddress"
                placeholder={t('checkout.address', locale)}
                rows={3}
                className={`input-bm px-4 pt-3 w-full bg-white border-2 rounded-2xl focus:border-bm-primary focus:ring-4 focus:ring-bm-primary/10 transition-all resize-none ${errors.clientAddress ? 'border-red-500' : 'border-stone-100'}`}
                {...register('clientAddress')}
              />
              {errors.clientAddress && (
                <p className="mt-1.5 text-xs font-medium text-red-500">{errors.clientAddress.message || t('checkout.errors.address', locale)}</p>
              )}
            </div>

            <div className="relative">
              <label htmlFor="notes" className="mb-1.5 block text-sm font-bold text-stone-700">
                {t('checkout.notes', locale)}
              </label>
              <input
                id="notes"
                type="text"
                placeholder={t('checkout.notes', locale)}
                className={`input-bm px-4 w-full h-14 bg-white border-2 rounded-2xl focus:border-bm-primary focus:ring-4 focus:ring-bm-primary/10 transition-all border-stone-100`}
                {...register('notes')}
              />
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm border border-stone-100/50">
            <h3 className="mb-4 text-base font-bold text-stone-900 border-b border-stone-100 pb-3">
              {t('checkout.summary', locale)}
            </h3>
            <div className="space-y-3 mb-4">
              {groupedItems.map((group) => (
                <div key={group.item.product.id}>
                  <div className="flex justify-between items-start text-sm">
                    <span className="text-stone-800 font-bold flex gap-2">
                      <span className="w-6 h-6 rounded-md bg-stone-100 flex items-center justify-center text-xs text-stone-500">{group.item.quantity}</span>
                      <span className="mt-0.5">{isRTL && group.item.product.nameAr ? group.item.product.nameAr : group.item.product.name}</span>
                    </span>
                    <span className="text-stone-900 font-bold mt-0.5">
                      {formatPrice(group.item.product.price * group.item.quantity)}
                    </span>
                  </div>
                  {group.supplements.length > 0 && (
                    <div className={`mt-1.5 space-y-1.5 ${isRTL ? 'pr-8' : 'pl-8'}`}>
                      {group.supplements.map((supp) => (
                        <div
                          key={`${supp.product.id}-${supp.attachedToProductId}`}
                          className="flex justify-between items-center text-xs"
                        >
                          <span className="text-stone-500 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-bm-accent"></span>
                            <span className="font-medium">{supp.quantity}× {isRTL && supp.product.nameAr ? supp.product.nameAr : supp.product.name}</span>
                            <span className="bg-stone-100 px-1.5 py-0.5 rounded text-[9px]">{t('cart.suppl', locale)}</span>
                          </span>
                          <span className="text-stone-600 font-medium">
                            {formatPrice(supp.product.price * supp.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="border-t border-stone-100 pt-4 space-y-2">
              <div className="flex justify-between text-sm text-stone-600 font-medium">
                <span>{t('checkout.subtotal', locale)}</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-stone-600 font-medium">
                <span>
                  {t('checkout.delivery', locale)} ({selectedZone.name})
                  {isNightDelivery && <span className="mx-1 text-[10px] text-bm-accent font-bold bg-bm-accent-50 px-1.5 py-0.5 rounded-md">🌙 {t('cart.night', locale)}</span>}
                </span>
                <span>{formatPrice(deliveryFee)}</span>
              </div>
              <div className="border-t border-stone-100 pt-3 mt-3">
                <div className="flex justify-between items-end">
                  <span className="text-lg font-bold text-stone-900">{t('checkout.total', locale)}</span>
                  <span className="text-2xl font-black text-bm-primary">{formatPrice(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {submitError && (
            <div className="rounded-2xl bg-red-50 border border-red-100 p-4">
              <p className="text-sm font-bold text-red-600 text-center">{submitError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`flex items-center justify-center gap-2 w-full h-14 rounded-full font-bold text-lg transition-all shadow-xl ${
              submitting
                ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                : 'bg-bm-primary text-stone-900 hover:brightness-105 active:scale-95 shadow-bm-primary/30'
            }`}
          >
            {submitting ? (
              <>
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-stone-400 border-t-stone-600" />
                {t('checkout.sending', locale)}
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                {t('checkout.confirm', locale)} - {formatPrice(total)}
              </>
            )}
          </button>
          
          <div className="h-8"></div>
        </form>
      </div>

      {pendingModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl safe-bottom animate-in slide-in-from-bottom-10" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-bm-accent-50 text-bm-accent">
                <AlertCircle className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900">{t('checkout.pendingTitle', locale)}</h3>
                <p className="text-sm font-medium text-stone-500">{t('checkout.pendingDesc', locale)}</p>
              </div>
            </div>

            <div className="mb-6 rounded-2xl bg-stone-50 border border-stone-100 p-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-stone-500 font-medium">{t('checkout.status', locale)}</span>
                  <span className="font-bold text-bm-accent bg-bm-accent-50 px-2.5 py-1 rounded-lg">
                    {pendingModal.existingOrder.status === 'CALLING'
                      ? t('checkout.calling', locale)
                      : t('checkout.waiting', locale)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-500 font-medium">{t('checkout.total', locale)}</span>
                  <span className="font-bold text-stone-900">
                    {formatPrice(pendingModal.existingOrder.total)}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-stone-500 font-medium whitespace-nowrap mt-0.5">{t('checkout.items', locale)}</span>
                  <span className="font-bold text-stone-800 text-right">
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
                className="w-full h-12 rounded-xl font-bold text-stone-900 bg-bm-primary/10 hover:bg-bm-primary/20 transition-colors"
              >
                {t('checkout.modifyOrder', locale)}
              </button>
              <button
                onClick={handleCancelAndCreate}
                disabled={pendingAction === 'create'}
                className="w-full h-12 rounded-xl font-bold text-white bg-stone-900 hover:bg-stone-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {pendingAction === 'create' ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    {t('checkout.creating', locale)}
                  </>
                ) : (
                  t('checkout.newOrder', locale)
                )}
              </button>
              <button
                onClick={() => setPendingModal(null)}
                className="w-full h-12 rounded-xl font-bold text-stone-500 hover:bg-stone-100 transition-colors mt-2"
              >
                {t('checkout.cancel', locale)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
