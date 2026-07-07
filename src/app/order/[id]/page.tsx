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
import { X, Check, Package, Bike, MapPin, Clock, CreditCard, ChevronLeft, ChevronRight, Star, Send } from 'lucide-react';

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

  // Review form states
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      // Try to get order via client API first (uses cookie)
      const clientRes = await fetch('/api/clients/me');
      if (clientRes.ok) {
        const clientData = await clientRes.json();
        const foundOrder = clientData.orders?.find((o: Order) => o.id === orderId);
        if (foundOrder) {
          setOrder(foundOrder);
          setLoading(false);
          return;
        }
      }

      // Fallback: try with clientToken from localStorage
      const clientToken = localStorage.getItem('bm_clientToken');
      if (clientToken) {
        const data = await getOrder(orderId);
        setOrder(data);
      } else {
        setError(isRTL ? 'الطلب غير موجود' : 'Commande introuvable');
      }
    } catch {
      setError(isRTL ? 'الطلب غير موجود' : 'Commande introuvable');
    } finally {
      setLoading(false);
    }
  }, [orderId, isRTL]);

  const submitReview = async () => {
    if (!order) return;
    
    setReviewSubmitting(true);
    try {
      const clientToken = localStorage.getItem('bm_clientToken');
      if (!clientToken) {
        alert(isRTL ? 'خطأ في المصادقة' : 'Erreur d\'authentification');
        return;
      }

      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${clientToken}`,
        },
        body: JSON.stringify({
          orderId: order.id,
          type: 'SERVICE',
          rating: reviewRating,
          comment: reviewComment.trim() || null,
        }),
      });

      if (res.ok) {
        setReviewSubmitted(true);
        setShowReviewForm(false);
        setTimeout(() => {
          setReviewSubmitted(false);
        }, 5000);
      } else {
        alert(isRTL ? 'فشل إرسال التقييم' : 'Échec de l\'envoi de l\'avis');
      }
    } catch (err) {
      console.error('Review submission error:', err);
      alert(isRTL ? 'خطأ في الشبكة' : 'Erreur réseau');
    } finally {
      setReviewSubmitting(false);
    }
  };

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

  // Check if review already submitted
  useEffect(() => {
    if (order?.status === 'DELIVERED') {
      const reviewKey = `bm_review_${orderId}`;
      const submitted = localStorage.getItem(reviewKey);
      setReviewSubmitted(!!submitted);
    }
  }, [order, orderId]);

  // Submit review
  const handleSubmitReview = async () => {
    if (!order) return;

    const clientToken = order.clientToken || localStorage.getItem('bm_clientToken');
    if (!clientToken) {
      alert(isRTL ? 'خطأ في المصادقة' : 'Erreur d\'authentification');
      return;
    }

    setReviewSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${clientToken}`,
        },
        body: JSON.stringify({
          orderId: order.id,
          type: 'SERVICE',
          rating: reviewRating,
          comment: reviewComment.trim() || null,
        }),
      });

      if (res.ok) {
        const reviewKey = `bm_review_${orderId}`;
        localStorage.setItem(reviewKey, 'true');
        setReviewSubmitted(true);
        setShowReviewForm(false);
        setReviewComment('');
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(isRTL ? 'فشل إرسال التقييم' : errorData.error || 'Échec de l\'envoi de l\'avis');
      }
    } catch (err) {
      console.error('Review submission error:', err);
      alert(isRTL ? 'فشل إرسال التقييم' : 'Échec de l\'envoi de l\'avis');
    } finally {
      setReviewSubmitting(false);
    }
  };

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

        {/* Review section - Only show if order is delivered */}
        {order.status === 'DELIVERED' && !reviewSubmitted && (
          <div className="bg-gradient-to-br from-bm-primary/5 to-orange-100/50 rounded-3xl p-5 shadow-sm border-2 border-bm-primary/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-bm-primary/20 flex items-center justify-center">
                <Star className="w-4 h-4 text-bm-primary" fill="currentColor" />
              </div>
              <h3 className="text-base font-bold text-stone-900">
                {isRTL ? 'قيّم تجربتك' : 'Évaluez votre expérience'}
              </h3>
            </div>

            {!showReviewForm ? (
              <button
                onClick={() => setShowReviewForm(true)}
                className="w-full bg-white hover:bg-stone-50 text-stone-900 font-bold py-3 px-4 rounded-2xl transition-colors border-2 border-bm-primary/30 shadow-sm"
              >
                {isRTL ? '✨ اترك تقييمًا' : '✨ Laisser un avis'}
              </button>
            ) : (
              <div className="space-y-4">
                {/* Star rating */}
                <div className="flex flex-col items-center gap-3 py-3">
                  <p className="text-sm font-medium text-stone-700">
                    {isRTL ? 'اختر تقييمك' : 'Votre note'}
                  </p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="transition-transform hover:scale-110 active:scale-95"
                      >
                        <Star
                          className={`w-8 h-8 ${
                            star <= reviewRating
                              ? 'fill-bm-primary text-bm-primary'
                              : 'text-stone-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment textarea */}
                <div>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder={isRTL ? 'شارك تجربتك معنا (اختياري)' : 'Partagez votre expérience (optionnel)'}
                    className="w-full min-h-[100px] p-3 bg-white border-2 border-stone-200 rounded-2xl text-sm focus:outline-none focus:border-bm-primary resize-none"
                    dir={isRTL ? 'rtl' : 'ltr'}
                    maxLength={500}
                  />
                  <p className="text-xs text-stone-500 mt-1 text-right">
                    {reviewComment.length}/500
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowReviewForm(false)}
                    disabled={reviewSubmitting}
                    className="flex-1 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold py-3 px-4 rounded-2xl transition-colors disabled:opacity-50"
                  >
                    {isRTL ? 'إلغاء' : 'Annuler'}
                  </button>
                  <button
                    onClick={handleSubmitReview}
                    disabled={reviewSubmitting}
                    className="flex-1 bg-bm-primary hover:bg-bm-primary/90 text-stone-900 font-bold py-3 px-4 rounded-2xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {reviewSubmitting ? (
                      <div className="w-5 h-5 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        {isRTL ? 'إرسال' : 'Envoyer'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Thank you message if review submitted */}
        {order.status === 'DELIVERED' && reviewSubmitted && (
          <div className="bg-green-50 border-2 border-green-200 rounded-3xl p-5 text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <p className="font-bold text-green-900 mb-1">
              {isRTL ? 'شكرًا لتقييمك!' : 'Merci pour votre avis !'}
            </p>
            <p className="text-sm text-green-700">
              {isRTL ? 'رأيك يساعدنا على التحسين' : 'Votre retour nous aide à nous améliorer'}
            </p>
          </div>
        )}
        
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
