'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import {
  connect,
  disconnect,
  joinClientRoom,
  onOrderValidated,
  onOrderRejected,
  onOrderExpired,
  onOrderAcceptedByLivreur,
  removeAllListeners,
} from '@/bm/lib/socket';
import { getTempOrder } from '@/bm/lib/api';
import type { OrderTempRedis } from '@/bm/types';
import { formatPrice } from '@/bm/lib/format';
import { useLocale } from '@/bm/lib/locale';
import { t } from '@/bm/lib/i18n';
import { Phone, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

function WaitingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { locale, isRTL, isMounted } = useLocale();
  
  const [orderTemp, setOrderTemp] = useState<OrderTempRedis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'waiting' | 'accepted' | 'validated' | 'rejected' | 'expired'>('waiting');
  const [livreurName, setLivreurName] = useState<string>('');
  const [rejectReason, setRejectReason] = useState<string>('');
  const [dots, setDots] = useState('');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const fetchOrder = useCallback(async () => {
    if (!token) return;
    try {
      const order = await getTempOrder(token);
      setOrderTemp(order);

      if (order.status === 'VALIDATED') {
        setStatus('validated');
      } else if (order.status === 'REJECTED') {
        setStatus('rejected');
      } else if (order.status === 'EXPIRED' || order.status === 'CANCELLED') {
        setStatus('expired');
      } else if (order.status === 'ACCEPTED') {
        setStatus('accepted');
      } else {
        setStatus('waiting');
      }
    } catch {
      setError(isRTL ? 'الطلب غير موجود أو منتهي الصلاحية' : 'Commande introuvable ou expirée');
    } finally {
      setLoading(false);
    }
  }, [token, isRTL]);

  useEffect(() => {
    if (!token) {
      setError(isRTL ? 'الرمز مفقود' : 'Token manquant');
      setLoading(false);
      return;
    }

    fetchOrder();

    connect();
    joinClientRoom(token);

    // When a livreur accepts the order
    onOrderAcceptedByLivreur((data) => {
      setStatus('accepted');
      setLivreurName(data.livreurName);
    });

    onOrderValidated((data) => {
      setStatus('validated');
      if (data.clientToken) {
        localStorage.setItem('bm_clientToken', data.clientToken);
      }
      if (data.orderId) {
        localStorage.setItem('bm_orderId', data.orderId);
        localStorage.setItem('bm_orderNumber', data.orderNumber || '');
      }
      localStorage.setItem('bm_lastPhone', orderTemp?.clientPhone || '');
      // Save order confirmed info for the menu page to show
      localStorage.setItem('bm_orderConfirmed', JSON.stringify({
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        confirmedAt: new Date().toISOString(),
      }));
      // Redirect to menu page with order confirmed indicator
      setTimeout(() => {
        router.push('/menu?orderConfirmed=1');
      }, 1500);
    });

    onOrderRejected((data) => {
      setStatus('rejected');
      setRejectReason(data.reason || (isRTL ? 'تعذر تأكيد طلبك' : 'Impossible de confirmer votre commande'));
    });

    onOrderExpired(() => {
      setStatus('expired');
    });

    pollingRef.current = setInterval(() => {
      fetchOrder();
    }, 5000);

    return () => {
      removeAllListeners();
      disconnect();
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [token, fetchOrder, orderTemp?.clientPhone, router, isRTL]);

  if (!isMounted) return null;

  if (!token) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 bg-stone-50" dir={isRTL ? 'rtl' : 'ltr'}>
        <AlertCircle className="mb-4 h-16 w-16 text-stone-300" />
        <p className="text-lg font-bold text-stone-700">{isRTL ? 'رابط غير صالح' : 'Lien invalide'}</p>
        <Link href="/menu" className="btn-bm-lg btn-bm-primary mt-6">
          {t('waiting.backToMenu', locale)}
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-stone-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-bm-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 bg-stone-50" dir={isRTL ? 'rtl' : 'ltr'}>
        <XCircle className="mb-4 h-16 w-16 text-red-400" />
        <p className="text-lg font-bold text-stone-700">{error}</p>
        <Link href="/menu" className="btn-bm-lg btn-bm-primary mt-6">
          {t('waiting.backToMenu', locale)}
        </Link>
      </div>
    );
  }

  if (status === 'validated') {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 bg-stone-50" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-green-100 shadow-xl shadow-green-100/50">
          <CheckCircle2 className="h-14 w-14 text-green-500" />
        </div>
        <h1 className="mb-2 text-2xl font-black text-green-600">{t('waiting.status.CONFIRMED', locale)}</h1>
        <p className="text-stone-500 font-medium mb-8">{t('waiting.desc.CONFIRMED', locale)}{dots}</p>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 bg-stone-50" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-red-100 shadow-xl shadow-red-100/50">
          <XCircle className="h-14 w-14 text-red-500" />
        </div>
        <h1 className="mb-2 text-2xl font-black text-stone-900">{isRTL ? 'تعذر التأكيد' : 'Impossible de confirmer'}</h1>
        <p className="mb-8 text-center font-medium text-stone-500 max-w-sm">
          {rejectReason || (isRTL ? 'لم يتمكن عامل التوصيل من تأكيد طلبك' : 'Votre commande n\'a pas pu être confirmée par notre livreur')}
        </p>
        <Link href="/menu" className="btn-bm-lg btn-bm-primary w-full max-w-xs flex items-center justify-center">
          {isRTL ? 'طلب جديد' : 'Nouvelle commande'}
        </Link>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 bg-stone-50" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-stone-200 shadow-xl shadow-stone-200/50">
          <Clock className="h-14 w-14 text-stone-400" />
        </div>
        <h1 className="mb-2 text-2xl font-black text-stone-900">{isRTL ? 'انتهت صلاحية الطلب' : 'Commande expirée'}</h1>
        <p className="mb-8 text-center font-medium text-stone-500 max-w-sm">
          {isRTL ? 'تم تجاوز وقت التأكيد' : 'Le délai de confirmation a été dépassé'}
        </p>
        <Link href="/menu" className="btn-bm-lg btn-bm-primary w-full max-w-xs flex items-center justify-center">
          {isRTL ? 'طلب جديد' : 'Nouvelle commande'}
        </Link>
      </div>
    );
  }

  // ACCEPTED status - livreur has claimed, waiting for validation
  if (status === 'accepted') {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-stone-50" dir={isRTL ? 'rtl' : 'ltr'}>
        <header className="w-full bg-blue-500/10 border-b border-blue-500/20 px-4 py-5 backdrop-blur-xl">
          <div className="mx-auto max-w-lg text-center">
            <p className="text-base font-bold text-blue-700">{isRTL ? 'تم استلام الطلب' : 'Commande prise en charge'}</p>
          </div>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
          <div className="relative mb-10">
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-blue-100 shadow-2xl shadow-blue-500/20">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-500">
                <Phone className="h-10 w-10 text-white animate-pulse" />
              </div>
            </div>
            <div className="absolute inset-0 animate-ping rounded-full border-4 border-blue-500/30" style={{ animationDuration: '2s' }} />
          </div>

          <h1 className="mb-3 text-center text-2xl font-black text-stone-900">
            {t('waiting.status.CALLING', locale)}{dots}
          </h1>
          {livreurName && (
            <p className="mb-2 text-center text-lg font-bold text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full">
              {livreurName} {isRTL ? 'استلم طلبك' : 'a pris votre commande'}
            </p>
          )}
          <p className="mb-8 text-center text-base font-medium text-stone-500 max-w-sm">
            {t('waiting.desc.CALLING', locale)}
          </p>

          {orderTemp && (
            <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-sm border border-stone-100 mb-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-stone-500">{t('checkout.total', locale)}</span>
                  <span className="text-lg font-black text-stone-900">
                    {formatPrice(orderTemp.total)}
                  </span>
                </div>
                <div className="border-t border-stone-100 pt-3 flex justify-between items-center text-sm font-medium">
                  <span className="text-stone-500">{t('checkout.items', locale)}</span>
                  <span className="text-stone-800 bg-stone-100 px-2.5 py-1 rounded-lg">
                    {orderTemp.items.reduce((sum, i) => sum + i.quantity, 0)} {total === 1 ? t('cart.article', locale) : t('cart.articles', locale)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 rounded-2xl bg-blue-50 border border-blue-100 p-4 max-w-sm w-full">
            <AlertCircle className="h-6 w-6 text-blue-500 shrink-0" />
            <p className="text-sm font-bold text-blue-800">
              {isRTL ? 'يرجى البقاء في هذه الصفحة أثناء الانتظار' : 'Restez sur cette page en attendant l\'appel'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // WAITING status - no livreur has accepted yet
  return (
    <div className="flex min-h-[100dvh] flex-col bg-stone-50" dir={isRTL ? 'rtl' : 'ltr'}>
      <header className="w-full bg-bm-primary/10 border-b border-bm-primary/20 px-4 py-5 backdrop-blur-xl">
        <div className="mx-auto max-w-lg text-center">
          <p className="text-base font-bold text-bm-primary-800">{t('checkout.pendingTitle', locale)}</p>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
        <div className="relative mb-10">
          <div className="flex h-36 w-36 items-center justify-center rounded-full bg-bm-primary/20 shadow-2xl shadow-bm-primary/20">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-bm-primary animate-pulse">
              <Clock className="h-12 w-12 text-stone-900" />
            </div>
          </div>
          <div className="absolute inset-0 animate-ping rounded-full border-4 border-bm-primary/40" style={{ animationDuration: '2s' }} />
        </div>

        <h1 className="mb-3 text-center text-2xl font-black text-stone-900">
          {t('checkout.sending', locale)}{dots}
        </h1>
        <p className="mb-2 text-center text-lg font-bold text-stone-700 bg-white border border-stone-200 px-4 py-1.5 rounded-full">
          {t('waiting.desc.PENDING', locale)}
        </p>

        {orderTemp && (
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-sm border border-stone-100 mb-8 mt-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-stone-500">{t('checkout.total', locale)}</span>
                <span className="text-lg font-black text-stone-900">
                  {formatPrice(orderTemp.total)}
                </span>
              </div>
              <div className="border-t border-stone-100 pt-3 flex justify-between items-center text-sm font-medium">
                <span className="text-stone-500">{t('checkout.items', locale)}</span>
                <span className="text-stone-800 bg-stone-100 px-2.5 py-1 rounded-lg">
                  {orderTemp.items.reduce((sum, i) => sum + i.quantity, 0)} {total === 1 ? t('cart.article', locale) : t('cart.articles', locale)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 rounded-2xl bg-bm-accent-50/50 border border-bm-accent/20 p-4 max-w-sm w-full">
          <AlertCircle className="h-6 w-6 text-bm-accent shrink-0" />
          <p className="text-sm font-bold text-bm-accent-800">
            {isRTL ? 'لا تغادر هذه الصفحة' : 'Ne quittez pas cette page'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function WaitingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-stone-50">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-bm-primary border-t-transparent" />
        </div>
      }
    >
      <WaitingContent />
    </Suspense>
  );
}
