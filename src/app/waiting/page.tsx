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

function WaitingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
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
      setError('Commande introuvable ou expirée');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setError('Token manquant');
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
      setRejectReason(data.reason || 'Impossible de confirmer votre commande');
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
  }, [token, fetchOrder, orderTemp?.clientPhone, router]);

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <svg className="mb-4 h-16 w-16 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
        <p className="text-lg font-semibold text-stone-700">Lien invalide</p>
        <Link href="/menu" className="btn-bm btn-bm-primary btn-bm-lg mt-4">
          Retour au menu
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-bm-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <svg className="mb-4 h-16 w-16 text-bm-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
        <p className="text-lg font-semibold text-stone-700">{error}</p>
        <Link href="/menu" className="btn-bm btn-bm-primary btn-bm-lg mt-4">
          Retour au menu
        </Link>
      </div>
    );
  }

  if (status === 'validated') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
          <svg className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-extrabold text-green-600">Commande confirmée !</h1>
        <p className="text-stone-500 mb-4">Redirection vers le menu{dots}</p>
        <Link href="/menu" className="btn-bm btn-bm-outline text-sm">
          Retour au menu maintenant
        </Link>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-50">
          <svg className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-extrabold text-stone-800">Impossible de confirmer</h1>
        <p className="mb-6 text-center text-stone-500">
          {rejectReason || 'Votre commande n\'a pas pu être confirmée par notre livreur'}
        </p>
        <Link href="/menu" className="btn-bm btn-bm-primary btn-bm-lg">
          Nouvelle commande
        </Link>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-stone-100">
          <svg className="h-12 w-12 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-extrabold text-stone-800">Commande expirée</h1>
        <p className="mb-6 text-center text-stone-500">
          Le délai de confirmation a été dépassé
        </p>
        <Link href="/menu" className="btn-bm btn-bm-primary btn-bm-lg">
          Nouvelle commande
        </Link>
      </div>
    );
  }

  // ACCEPTED status - livreur has claimed, waiting for validation
  if (status === 'accepted') {
    return (
      <div className="flex min-h-screen flex-col items-center">
        <header className="w-full bg-blue-500 px-4 py-6">
          <div className="mx-auto max-w-lg text-center">
            <p className="text-sm font-medium text-white/80">Commande prise en charge</p>
          </div>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
          <div className="relative mb-8">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-blue-100">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-200">
                <svg className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                </svg>
              </div>
            </div>
            <div className="absolute inset-0 animate-ping rounded-full border-2 border-blue-400/20" style={{ animationDuration: '2s' }} />
          </div>

          <h1 className="mb-3 text-center text-xl font-extrabold text-stone-800">
            Un livreur vous appellera{dots}
          </h1>
          {livreurName && (
            <p className="mb-2 text-center text-base font-medium text-blue-600">
              {livreurName} a pris votre commande
            </p>
          )}
          <p className="mb-6 text-center text-sm text-stone-500">
            Il va vous appeler pour vérifier votre commande, puis la transmettre à la cuisine
          </p>

          {orderTemp && (
            <div className="w-full rounded-xl bg-white p-4 shadow-sm border border-stone-100 mb-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-500">Total</span>
                  <span className="font-semibold">
                    {formatPrice(orderTemp.total)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Articles</span>
                  <span className="font-medium">
                    {orderTemp.items.reduce((sum, i) => sum + i.quantity, 0)} article(s)
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
            <svg className="h-5 w-5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <p className="text-sm font-medium text-blue-700">
              Restez sur cette page en attendant l&apos;appel
            </p>
          </div>
        </div>
      </div>
    );
  }

  // WAITING status - no livreur has accepted yet
  return (
    <div className="flex min-h-screen flex-col items-center">
      <header className="w-full bg-bm-primary px-4 py-6">
        <div className="mx-auto max-w-lg text-center">
          <p className="text-sm font-medium text-stone-700">Commande en attente</p>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
        <div className="relative mb-8">
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-bm-primary-100">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-bm-primary-200 animate-pulse">
              <svg className="h-12 w-12 text-bm-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
                />
              </svg>
            </div>
          </div>
          <div className="absolute inset-0 animate-ping rounded-full border-2 border-bm-primary/20" style={{ animationDuration: '2s' }} />
        </div>

        <h1 className="mb-3 text-center text-xl font-extrabold text-stone-800">
          Envoi en cours{dots}
        </h1>
        <p className="mb-2 text-center text-base font-medium text-stone-600">
          Votre commande est envoyée à nos livreurs
        </p>
        <p className="mb-6 text-center text-sm text-stone-500">
          Un livreur la prendra en charge et vous appellera
        </p>

        {orderTemp && (
          <div className="w-full rounded-xl bg-white p-4 shadow-sm border border-stone-100 mb-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-500">Total</span>
                <span className="font-semibold">
                  {formatPrice(orderTemp.total)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Articles</span>
                <span className="font-medium">
                  {orderTemp.items.reduce((sum, i) => sum + i.quantity, 0)} article(s)
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 rounded-xl bg-bm-accent-50 border border-bm-accent-100 px-4 py-3">
          <svg className="h-5 w-5 text-bm-accent-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <p className="text-sm font-medium text-bm-accent-500">
            Ne quittez pas cette page
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
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-bm-primary border-t-transparent" />
        </div>
      }
    >
      <WaitingContent />
    </Suspense>
  );
}
