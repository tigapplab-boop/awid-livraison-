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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' });
}

interface TimelineStep {
  status: OrderStatus;
  label: string;
  description: string;
}

const TIMELINE_STEPS: TimelineStep[] = [
  { status: 'PENDING', label: 'Commande reçue', description: 'Votre commande a été enregistrée' },
  { status: 'CONFIRMED', label: 'Confirmée', description: 'Le livreur a confirmé votre commande' },
  { status: 'PREPARING', label: 'En préparation', description: 'Votre commande est en cours de préparation' },
  { status: 'READY', label: 'Prête', description: 'Votre commande est prête, le livreur est en route' },
  { status: 'DELIVERED', label: 'Livrée', description: 'Votre commande a été livrée' },
];

const STATUS_ORDER: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED'];

function getStepIndex(status: OrderStatus): number {
  const idx = STATUS_ORDER.indexOf(status);
  return idx >= 0 ? idx : 0;
}

export default function OrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketConnected = useRef(false);

  const fetchOrder = useCallback(async () => {
    try {
      const data = await getOrder(orderId);
      setOrder(data);
    } catch {
      setError('Commande introuvable');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bm-bg">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-bm-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bm-bg px-6">
        <svg className="mb-4 h-16 w-16 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
        <p className="text-lg font-semibold text-stone-700">{error || 'Commande introuvable'}</p>
        <Link href="/menu" className="btn-bm btn-bm-primary btn-bm-lg mt-4">
          Retour au menu
        </Link>
      </div>
    );
  }

  const currentIndex = getStepIndex(order.status);
  const isCancelled = order.status === 'CANCELLED';

  return (
    <div className="flex min-h-screen flex-col bg-bm-bg">
      {/* Header */}
      <header className="bg-bm-primary px-4 py-4">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-stone-700">Suivi de commande</p>
              <h1 className="text-2xl font-extrabold text-stone-900 font-mono tracking-wider">
                {order.orderNumber}
              </h1>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
              <span className="text-2xl font-extrabold text-stone-900">
                {order.orderNumber.split('-').pop()}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-6">
        {/* Status badge */}
        <div className="mb-6 flex justify-center">
          <div
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2 ${
              isCancelled
                ? 'bg-bm-secondary-100 text-bm-secondary-700'
                : order.status === 'DELIVERED'
                  ? 'bg-bm-green-100 text-bm-green'
                  : 'bg-bm-primary-100 text-bm-primary-700'
            }`}
          >
            {isCancelled ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            ) : order.status === 'DELIVERED' ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            ) : (
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-current" />
            )}
            <span className="text-sm font-bold">
              {isCancelled
                ? 'Annulée'
                : order.status === 'DELIVERED'
                  ? 'Livrée'
                  : 'En cours'}
            </span>
          </div>
        </div>

        {/* Timeline */}
        {!isCancelled ? (
          <div className="mb-8">
            {TIMELINE_STEPS.map((step, index) => {
              const isCompleted = index < currentIndex;
              const isCurrent = index === currentIndex;

              return (
                <div key={step.status}>
                  <div className="timeline-step">
                    <div
                      className={`timeline-dot ${
                        isCompleted
                          ? 'timeline-dot-completed'
                          : isCurrent
                            ? 'timeline-dot-current'
                            : 'timeline-dot-pending'
                      }`}
                    >
                      {isCompleted ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          isCompleted ? 'text-bm-primary' : isCurrent ? 'text-stone-800' : 'text-stone-400'
                        }`}
                      >
                        {step.label}
                      </p>
                      <p className="text-xs text-stone-400">{step.description}</p>
                    </div>
                  </div>
                  {index < TIMELINE_STEPS.length - 1 && (
                    <div className={`timeline-line ${isCompleted ? 'timeline-line-completed' : 'timeline-line-pending'}`} />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mb-8 rounded-xl bg-bm-secondary-50 border border-bm-secondary-100 p-4">
            <p className="text-sm font-semibold text-bm-secondary-700">Commande annulée</p>
            {order.cancelReason && (
              <p className="mt-1 text-sm text-bm-secondary-600">{order.cancelReason}</p>
            )}
          </div>
        )}

        {/* Order Details */}
        <div className="rounded-xl bg-white p-4 shadow-sm border border-stone-100 mb-4">
          <h3 className="mb-3 text-sm font-semibold text-stone-700 uppercase tracking-wider">
            Détails de la commande
          </h3>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-stone-600">
                  {item.quantity}× {item.product.name}
                </span>
                <span className="font-medium text-stone-800">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t border-stone-100 pt-3 space-y-1">
            <div className="flex justify-between text-sm text-stone-600">
              <span>Sous-total</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-stone-600">
              <span>Livraison ({order.deliveryZone})</span>
              <span>{formatPrice(order.deliveryFee)}</span>
            </div>
            <div className="border-t border-stone-100 pt-2">
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span className="text-bm-primary">{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery info */}
        <div className="rounded-xl bg-white p-4 shadow-sm border border-stone-100 mb-4">
          <h3 className="mb-3 text-sm font-semibold text-stone-700 uppercase tracking-wider">
            Livraison
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex gap-2">
              <span className="text-stone-500">Adresse:</span>
              <span className="text-stone-800">{order.clientAddress}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-stone-500">Zone:</span>
              <span className="text-stone-800">{order.deliveryZone}</span>
            </div>
            {order.assignedLivreur && (
              <div className="flex gap-2">
                <span className="text-stone-500">Livreur:</span>
                <span className="text-stone-800">{order.assignedLivreur.name}</span>
              </div>
            )}
            <div className="flex gap-2">
              <span className="text-stone-500">Commandé à:</span>
              <span className="text-stone-800">{formatDate(order.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Payment info */}
        <div className="rounded-xl bg-white p-4 shadow-sm border border-stone-100">
          <h3 className="mb-3 text-sm font-semibold text-stone-700 uppercase tracking-wider">
            Paiement
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500">Méthode</span>
              <span className="text-stone-800">Espèces</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Statut</span>
              <span
                className={`font-medium ${
                  order.paymentStatus === 'PAID'
                    ? 'text-bm-green'
                    : order.paymentStatus === 'PARTIAL'
                      ? 'text-bm-accent-500'
                      : 'text-stone-600'
                }`}
              >
                {order.paymentStatus === 'PAID'
                  ? 'Payé'
                  : order.paymentStatus === 'PARTIAL'
                    ? 'Partiel'
                    : order.paymentStatus === 'OFFERED'
                      ? 'Offert'
                      : 'En attente'}
              </span>
            </div>
          </div>
        </div>

        {/* New order button */}
        <div className="mt-6 mb-8">
          <Link href="/menu" className="btn-bm btn-bm-outline btn-bm-lg block w-full text-center">
            Nouvelle commande
          </Link>
        </div>
      </div>
    </div>
  );
}
