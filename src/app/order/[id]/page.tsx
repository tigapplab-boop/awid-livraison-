'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getOrder } from '@/bm/lib/api';
import {
  connect,
  disconnect,
  joinClientRoom,
  leaveClientRoom,
  onOrderStatusUpdate,
  removeAllListeners,
} from '@/bm/lib/socket';
import type { Order, OrderStatus } from '@/bm/types';
import { formatPrice } from '@/bm/lib/format';
import { useLocale } from '@/lib/locale';
import { t } from '@/lib/i18n';
import { X, Check, Package, Bike, MapPin, Clock, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' });
}

const STATUS_ORDER: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED'];

function getStepIndex(status: OrderStatus): number {
  const idx = STATUS_ORDER.indexOf(status);
  return idx >= 0 ? idx : 0;
}

export default function OrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const { locale, isRTL, isMounted } = useLocale();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketConnected = useRef(false);

  const fetchOrder = useCallback(async () => {
    try {
      const data = await getOrder(orderId);
      setOrder(data);
    } catch {
      setError(isRTL ? 'الطلب غير موجود' : 'Commande introuvable');
    } finally {
      setLoading(false);
    }
  }, [orderId, isRTL]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Socket.IO for real-time updates
  useEffect(() => {
    if (!order) return;

    const clientToken = order.clientToken || localStorage.getItem('bm_clientToken');
    if (clientToken && !socketConnected.current) {
      socketConnected.current = true;
      connect();
      joinClientRoom(clientToken);

      onOrderStatusUpdate((data) => {
        if (data.orderId === orderId) {
          setOrder(data.order);
        }
      });
    }

    return () => {
      if (socketConnected.current) {
        leaveClientRoom(clientToken || '');
        removeAllListeners();
        disconnect();
        socketConnected.current = false;
      }
    };
  }, [order, orderId]);

  // Check for active order on return visit
  useEffect(() => {
    const savedOrderId = localStorage.getItem('bm_orderId');
    const savedToken = localStorage.getItem('bm_clientToken');
    if (savedOrderId && savedToken && !orderId) {
      router.replace(`/order/${savedOrderId}`);
    }
  }, [orderId, router]);

  if (!isMounted) return null;

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-stone-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-bm-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-stone-50 px-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <X className="mb-4 h-16 w-16 text-stone-300" />
        <p className="text-xl font-bold text-stone-800 mb-6">{error || (isRTL ? 'الطلب غير موجود' : 'Commande introuvable')}</p>
        <Link href="/menu" className="btn-bm-lg btn-bm-primary w-full max-w-xs flex items-center justify-center gap-2">
          {t('waiting.backToMenu', locale)}
        </Link>
      </div>
    );
  }

  const currentIndex = getStepIndex(order.status);
  const isCancelled = order.status === 'CANCELLED';

  const TIMELINE_STEPS = [
    { status: 'PENDING', label: isRTL ? 'تم استلام الطلب' : 'Commande reçue', description: isRTL ? 'تم تسجيل طلبك' : 'Votre commande a été enregistrée' },
    { status: 'CONFIRMED', label: isRTL ? 'تم التأكيد' : 'Confirmée', description: isRTL ? 'أكد عامل التوصيل طلبك' : 'Le livreur a confirmé votre commande' },
    { status: 'PREPARING', label: isRTL ? 'جاري التحضير' : 'En préparation', description: isRTL ? 'طلبك قيد التحضير' : 'Votre commande est en cours de préparation' },
    { status: 'READY', label: isRTL ? 'جاهز' : 'Prête', description: isRTL ? 'طلبك جاهز، عامل التوصيل في الطريق' : 'Votre commande est prête, le livreur est en route' },
    { status: 'DELIVERED', label: isRTL ? 'تم التوصيل' : 'Livrée', description: isRTL ? 'تم توصيل طلبك' : 'Votre commande a été livrée' },
  ];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-stone-50" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-stone-200/50 px-4 py-4">
        <div className="flex items-center gap-4">
          <Link href="/menu" className="w-10 h-10 flex items-center justify-center rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors">
            {isRTL ? <ChevronRight className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-stone-900 leading-none">{t('waiting.title', locale)}</h1>
            <p className="text-sm font-black text-bm-primary tracking-wider mt-1 font-mono">
              #{order.orderNumber}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-6 space-y-6">
        {/* Status badge */}
        <div className="flex justify-center">
          <div
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 shadow-sm border ${
              isCancelled
                ? 'bg-red-50 border-red-100 text-red-600'
                : order.status === 'DELIVERED'
                  ? 'bg-green-50 border-green-100 text-green-600'
                  : 'bg-bm-primary/10 border-bm-primary/20 text-bm-primary-800'
            }`}
          >
            {isCancelled ? (
              <X className="h-5 w-5" />
            ) : order.status === 'DELIVERED' ? (
              <Check className="h-5 w-5" />
            ) : (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-bm-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-bm-primary"></span>
              </span>
            )}
            <span className="text-sm font-bold">
              {isCancelled
                ? t('waiting.status.CANCELLED', locale)
                : order.status === 'DELIVERED'
                  ? t('waiting.status.DELIVERED', locale)
                  : t(`waiting.status.${order.status}`, locale) || (isRTL ? 'جاري التنفيذ' : 'En cours')}
            </span>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100/50">
          {!isCancelled ? (
            <div className="relative">
              {TIMELINE_STEPS.map((step, index) => {
                const isCompleted = index < currentIndex;
                const isCurrent = index === currentIndex;
                const isLast = index === TIMELINE_STEPS.length - 1;

                return (
                  <div key={step.status} className="relative">
                    <div className="flex items-start gap-4 mb-6 relative z-10">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          isCompleted
                            ? 'bg-bm-primary border-bm-primary text-stone-900 shadow-md shadow-bm-primary/20'
                            : isCurrent
                              ? 'bg-white border-bm-primary text-bm-primary shadow-lg shadow-bm-primary/10'
                              : 'bg-stone-50 border-stone-200 text-stone-400'
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="h-4 w-4" />
                        ) : isCurrent ? (
                          <span className="h-2.5 w-2.5 rounded-full bg-bm-primary" />
                        ) : (
                          <span className="text-xs font-bold">{index + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 pt-1">
                        <p
                          className={`text-sm font-bold ${
                            isCompleted || isCurrent ? 'text-stone-900' : 'text-stone-400'
                          }`}
                        >
                          {step.label}
                        </p>
                        <p className={`text-xs mt-1 ${isCurrent ? 'text-stone-500' : 'text-stone-400'}`}>
                          {step.description}
                        </p>
                      </div>
                    </div>
                    {!isLast && (
                      <div 
                        className={`absolute top-8 bottom-[-16px] w-0.5 ${isRTL ? 'right-4 translate-x-1/2' : 'left-4 -translate-x-1/2'} ${
                          isCompleted ? 'bg-bm-primary' : 'bg-stone-100'
                        }`} 
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-center">
              <p className="text-sm font-bold text-red-600">{t('waiting.status.CANCELLED', locale)}</p>
              {order.cancelReason && (
                <p className="mt-2 text-sm font-medium text-red-500">{order.cancelReason}</p>
              )}
            </div>
          )}
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-stone-100/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center">
              <Package className="w-4 h-4 text-stone-600" />
            </div>
            <h3 className="text-base font-bold text-stone-900">
              {t('waiting.orderSummary', locale)}
            </h3>
          </div>
          
          <div className="space-y-3 mb-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="font-bold text-stone-700 flex gap-2">
                  <span className="w-5 h-5 rounded bg-stone-100 flex items-center justify-center text-xs text-stone-500">{item.quantity}</span>
                  <span>{item.product.name}</span>
                </span>
                <span className="font-bold text-stone-900">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-stone-100 pt-4 space-y-2">
            <div className="flex justify-between text-sm font-medium text-stone-600">
              <span>{t('cart.subtotal', locale)}</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm font-medium text-stone-600">
              <span>{t('cart.delivery', locale)} ({order.deliveryZone})</span>
              <span>{formatPrice(order.deliveryFee)}</span>
            </div>
            <div className="border-t border-stone-100 pt-3 mt-3">
              <div className="flex justify-between items-end">
                <span className="text-lg font-bold text-stone-900">{t('cart.total', locale)}</span>
                <span className="text-2xl font-black text-bm-primary">{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery info */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-stone-100/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-stone-600" />
            </div>
            <h3 className="text-base font-bold text-stone-900">
              {t('waiting.deliveryInfo', locale)}
            </h3>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
              <span className="font-medium text-stone-800 leading-snug">{order.clientAddress}</span>
            </div>
            {order.assignedLivreur && (
              <div className="flex items-center gap-3">
                <Bike className="w-4 h-4 text-bm-primary shrink-0" />
                <span className="font-bold text-stone-800">{order.assignedLivreur.name}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-stone-400 shrink-0" />
              <span className="font-medium text-stone-600">{formatDate(order.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Payment info */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-stone-100/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-stone-600" />
            </div>
            <h3 className="text-base font-bold text-stone-900">
              {isRTL ? 'الدفع' : 'Paiement'}
            </h3>
          </div>
          
          <div className="space-y-3 text-sm font-medium">
            <div className="flex justify-between items-center bg-stone-50 p-3 rounded-2xl">
              <span className="text-stone-500">{isRTL ? 'الطريقة' : 'Méthode'}</span>
              <span className="font-bold text-stone-900">{isRTL ? 'نقدًا' : 'Espèces'}</span>
            </div>
            <div className="flex justify-between items-center bg-stone-50 p-3 rounded-2xl">
              <span className="text-stone-500">{isRTL ? 'الحالة' : 'Statut'}</span>
              <span
                className={`font-bold px-3 py-1 rounded-full ${
                  order.paymentStatus === 'PAID'
                    ? 'bg-green-100 text-green-700'
                    : order.paymentStatus === 'PARTIAL'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-stone-200 text-stone-700'
                }`}
              >
                {order.paymentStatus === 'PAID'
                  ? (isRTL ? 'مدفوع' : 'Payé')
                  : order.paymentStatus === 'PARTIAL'
                    ? (isRTL ? 'جزئي' : 'Partiel')
                    : order.paymentStatus === 'OFFERED'
                      ? (isRTL ? 'مجاني' : 'Offert')
                      : (isRTL ? 'قيد الانتظار' : 'En attente')}
              </span>
            </div>
          </div>
        </div>
        
        {/* Bottom spacer */}
        <div className="h-16"></div>
      </div>
      
      {/* Fixed bottom action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-stone-50 via-stone-50 to-transparent z-40 pb-safe-bottom">
        <Link href="/menu" className="btn-bm-lg btn-bm-primary w-full flex items-center justify-center shadow-xl shadow-bm-primary/20">
          {isRTL ? 'طلب جديد' : 'Nouvelle commande'}
        </Link>
      </div>
    </div>
  );
}
