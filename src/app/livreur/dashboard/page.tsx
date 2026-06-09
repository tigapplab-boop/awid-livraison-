'use client'

// ========================================
// AWID / BURGER MINUTE - Livreur Dashboard
// 4 tabs: Nouvelles | Acceptées | Prêtes | Livrées
// Flow: PENDING → Accept (claim) → Call client → Validate (sends to cuisine)
// + Encaissement (Cash Collection) modal
// + Payment Issue modal
// ========================================

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Order, OrderTempRedis, PaymentIssue } from '@/bm/types'
import {
  getStoredUser,
  clearAuth,
  getPendingTempOrders,
  acceptTempOrder,
  validateTempOrder,
  rejectTempOrder,
  getOrders,
  updateOrderStatus,
  formatPrice,
  sendHeartbeat,
  updateAvailability,
  type StoredUser,
} from '@/bm/lib/livreur-api'
import {
  connect,
  disconnect,
  joinLivreurRoom,
  onOrderNew,
  onOrderAccepted,
  onOrderUpdated,
  onOrderStatusUpdate,
  onOrderConfirmed,
  onOrderReady,
  removeAllListeners as removeAllSocketListeners,
} from '@/bm/lib/socket'
import { subscribePush, isPushSubscribed, unsubscribePush } from '@/bm/lib/push-notifications'
import AvailabilityManager from '@/components/livreur/AvailabilityManager'
import {
  Phone,
  LogOut,
  RefreshCw,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  X,
  Bike,
  DollarSign,
  Bell,
  BellOff,
  HandMetal,
  Calendar,
} from 'lucide-react'

// ========================================
// Types
// ========================================

type TabKey = 'nouvelles' | 'acceptees' | 'pretes' | 'livrees'

interface TabConfig {
  key: TabKey
  label: string
  count: number
}

const PAYMENT_ISSUE_OPTIONS: { value: PaymentIssue; label: string }[] = [
  { value: 'CLIENT_SHORT_MONEY', label: "Client n'a pas assez" },
  { value: 'CLIENT_NO_CHANGE', label: "Client n'a pas la monnaie" },
  { value: 'CLIENT_REFUSES_PAY', label: 'Client refuse de payer' },
  { value: 'WRONG_ADDRESS', label: 'Adresse introuvable' },
  { value: 'CLIENT_NOT_HOME', label: 'Client absent' },
  { value: 'OTHER', label: 'Autre' },
]

const REJECT_REASONS = [
  'Faux numéro',
  'Pas de réponse',
  'Client annule',
]

// ========================================
// Main Component
// ========================================

export default function LivreurDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<StoredUser | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('nouvelles')
  const [isAvailable, setIsAvailable] = useState(true)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showAvailabilityManager, setShowAvailabilityManager] = useState(false)
  const [availabilitySchedule, setAvailabilitySchedule] = useState<any>(null)

  // Data states
  const [tempOrders, setTempOrders] = useState<OrderTempRedis[]>([])
  const [confirmedOrders, setConfirmedOrders] = useState<Order[]>([])
  const [readyOrders, setReadyOrders] = useState<Order[]>([])
  const [deliveredOrders, setDeliveredOrders] = useState<Order[]>([])

  // Encaissement modal
  const [encaissementOrder, setEncaissementOrder] = useState<Order | null>(null)
  const [amountPaidInput, setAmountPaidInput] = useState('')
  const [processingPayment, setProcessingPayment] = useState(false)

  // Issue modal
  const [issueOrder, setIssueOrder] = useState<Order | null>(null)
  const [issueMotif, setIssueMotif] = useState<PaymentIssue>('CLIENT_SHORT_MONEY')
  const [issueAmount, setIssueAmount] = useState('')
  const [issueNote, setIssueNote] = useState('')
  const [submittingIssue, setSubmittingIssue] = useState(false)

  // Reject modal
  const [rejectingToken, setRejectingToken] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [submittingReject, setSubmittingReject] = useState(false)

  // Call tracking for accepted orders
  const [calledOrders, setCalledOrders] = useState<Set<string>>(new Set())

  // Accepting state (loading indicator per order)
  const [acceptingToken, setAcceptingToken] = useState<string | null>(null)

  // Error / success messages
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Push notification status
  const [pushEnabled, setPushEnabled] = useState(false)

  // ========================================
  // Init & Auth
  // ========================================

  useEffect(() => {
    const stored = getStoredUser()
    if (!stored) {
      window.location.href = '/login'
      return
    }
    setUser(stored)
    setIsAvailable(stored.isAvailable)
  }, [])

  // ========================================
  // Toast
  // ========================================

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  // ========================================
  // Data Fetching
  // ========================================

  const fetchData = useCallback(async (showSpinner = false) => {
    if (!user) return
    if (showSpinner) setLoading(true)
    else setRefreshing(true)

    try {
      const [temp, confirmed, ready, delivered] = await Promise.all([
        getPendingTempOrders(),
        getOrders({ status: 'CONFIRMED' }),
        getOrders({ status: 'READY' }),
        getOrders({ status: 'DELIVERED' }),
      ])

      setTempOrders(temp)
      setConfirmedOrders(confirmed)
      setReadyOrders(ready)
      // Only show today's delivered orders
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      setDeliveredOrders(
        delivered.filter(o => new Date(o.deliveredAt || o.createdAt) >= today)
      )
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchData(true)
      // Auto-refresh every 30 seconds (reduced from 15s to minimize database load)
      const interval = setInterval(() => fetchData(false), 30000)
      return () => clearInterval(interval)
    }
  }, [user, fetchData])

  // ========================================
  // Socket.IO + Push Notifications
  // ========================================

  useEffect(() => {
    if (!user) return

    // Connect to Socket.IO and join livreur room
    const socket = connect()
    joinLivreurRoom(user.id)

    // Listen for new temp orders
    onOrderNew(() => {
      showToast('success', 'Nouvelle commande !')
      fetchData()
    })

    // Listen for order accepted by another livreur
    onOrderAccepted((data) => {
      // Remove the order from our local list if we didn't accept it
      if (data.acceptedByLivreurId !== user.id) {
        setTempOrders(prev => prev.filter(o => o.tempToken !== data.tempToken))
      }
    })

    // Listen for order updates
    onOrderUpdated(() => {
      fetchData()
    })

    // Listen for status changes
    onOrderStatusUpdate((data) => {
      showToast('success', `Commande mise a jour : ${data.status}`)
      fetchData()
    })

    // Listen for confirmed orders (from admin)
    onOrderConfirmed((data) => {
      showToast('success', `Commande ${data.orderNumber} confirmee !`)
      fetchData()
    })

    // Listen for ready orders
    onOrderReady((data) => {
      showToast('success', `Commande ${data.orderNumber} prete !`)
      fetchData()
    })

    // Subscribe to push notifications
    const initPush = async () => {
      try {
        const subscribed = await isPushSubscribed()
        setPushEnabled(subscribed)
        if (!subscribed) {
          const result = await subscribePush(user.id)
          setPushEnabled(!!result)
          if (result) {
            showToast('success', 'Notifications push activees')
          }
        }
      } catch (err) {
        console.warn('[Push] Could not subscribe:', err)
      }
    }
    initPush()

    // Send heartbeat every 30 seconds
    const heartbeatInterval = setInterval(async () => {
      if (isAvailable) {
        await sendHeartbeat()
      }
    }, 30000)

    // Register service worker if not already
    if ('serviceWorker' in navigator && !navigator.serviceWorker.controller) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    return () => {
      clearInterval(heartbeatInterval)
      removeAllSocketListeners()
      disconnect()
    }
  }, [user, fetchData, isAvailable])

  // Toggle push notification
  const handleTogglePush = async () => {
    if (!user) return
    if (pushEnabled) {
      const result = await unsubscribePush()
      setPushEnabled(!result)
      if (result) {
        showToast('success', 'Notifications desactivées')
      }
    } else {
      const result = await subscribePush(user.id)
      setPushEnabled(!!result)
      if (result) {
        showToast('success', 'Notifications push activées')
      }
    }
  }

  // Handle availability toggle
  const handleToggleAvailability = async () => {
    if (!user) return
    const newAvailability = !isAvailable
    try {
      await updateAvailability(user.id, newAvailability, availabilitySchedule)
      setIsAvailable(newAvailability)
      showToast('success', newAvailability ? 'Vous êtes disponible' : 'Vous êtes indisponible')
    } catch (err) {
      showToast('error', 'Erreur lors de la mise à jour')
    }
  }

  // Handle schedule update from AvailabilityManager
  const handleUpdateSchedule = async (newIsAvailable: boolean, newSchedule: any) => {
    if (!user) return
    try {
      await updateAvailability(user.id, newIsAvailable, newSchedule)
      setIsAvailable(newIsAvailable)
      setAvailabilitySchedule(newSchedule)
      showToast('success', 'Horaires mis à jour ✓')
    } catch (err) {
      showToast('error', 'Erreur lors de la mise à jour')
      throw err
    }
  }

  // ========================================
  // Actions: Temp Orders
  // ========================================

  // Accept (claim) a pending order
  const handleAcceptOrder = async (token: string) => {
    setAcceptingToken(token)
    try {
      const result = await acceptTempOrder(token)
      showToast('success', 'Commande acceptée ! Appelez le client pour vérifier.')
      // Update local state: move from PENDING to accepted
      setTempOrders(prev => prev.map(o =>
        o.tempToken === token ? { ...o, status: 'ACCEPTED' as const, acceptedByLivreurId: user?.id || null, acceptedAt: new Date().toISOString(), livreurId: user?.id || null } : o
      ))
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erreur lors de l\'acceptation')
      fetchData() // Refresh to get accurate state
    } finally {
      setAcceptingToken(null)
    }
  }

  const handleCallClient = (phone: string, tokenId: string) => {
    window.open(`tel:${phone}`, '_self')
    setCalledOrders(prev => new Set(prev).add(tokenId))
  }

  const handleValidateOrder = async (token: string) => {
    try {
      await validateTempOrder(token)
      showToast('success', 'Commande validée ✓ Envoyée à la cuisine')
      setTempOrders(prev => prev.filter(o => o.tempToken !== token))
      fetchData()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erreur de validation')
    }
  }

  const handleRejectOrder = async () => {
    if (!rejectingToken) return
    setSubmittingReject(true)
    try {
      await rejectTempOrder(rejectingToken)
      showToast('success', 'Commande refusée')
      setRejectingToken(null)
      setRejectReason('')
      fetchData()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSubmittingReject(false)
    }
  }

  // ========================================
  // Actions: Orders
  // ========================================

  const handlePickupOrder = (order: Order) => {
    setEncaissementOrder(order)
    setAmountPaidInput('')
  }

  const handlePaymentOk = async () => {
    if (!encaissementOrder) return
    setProcessingPayment(true)
    try {
      const total = encaissementOrder.total
      const paid = Math.round(parseFloat(amountPaidInput || '0') * 100) // convert DA to centimes
      const change = Math.max(0, paid - total)

      await updateOrderStatus(encaissementOrder.id, {
        status: 'DELIVERED',
        amountPaid: paid,
        changeDue: change,
      })

      showToast('success', 'Paiement enregistré ✓')
      setEncaissementOrder(null)
      setAmountPaidInput('')
      fetchData()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erreur')
    } finally {
      setProcessingPayment(false)
    }
  }

  const handleOpenIssue = () => {
    if (!encaissementOrder) return
    setIssueOrder(encaissementOrder)
    setIssueMotif('CLIENT_SHORT_MONEY')
    setIssueAmount('')
    setIssueNote('')
  }

  const handleSubmitIssue = async () => {
    if (!issueOrder) return
    setSubmittingIssue(true)
    try {
      const paid = Math.round(parseFloat(issueAmount || '0') * 100)
      await updateOrderStatus(issueOrder.id, {
        status: 'DELIVERED',
        amountPaid: paid || undefined,
        paymentIssue: issueMotif,
        paymentIssueNote: issueNote || undefined,
      })

      showToast('success', 'Problème signalé')
      setIssueOrder(null)
      setEncaissementOrder(null)
      setAmountPaidInput('')
      fetchData()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSubmittingIssue(false)
    }
  }

  // ========================================
  // Logout
  // ========================================

  const handleLogout = () => {
    disconnect()
    clearAuth()
    window.location.href = '/login'
  }

  // ========================================
  // Computed - Split temp orders into PENDING and ACCEPTED
  // ========================================

  const pendingOrders = tempOrders.filter(o => o.status === 'PENDING')
  const acceptedOrders = tempOrders.filter(o => o.status === 'ACCEPTED')

  const tabs: TabConfig[] = [
    { key: 'nouvelles', label: 'Nouvelles', count: pendingOrders.length },
    { key: 'acceptees', label: 'Acceptées', count: acceptedOrders.length },
    { key: 'pretes', label: 'Prêtes', count: readyOrders.length },
    { key: 'livrees', label: 'Livrées', count: deliveredOrders.length },
  ]

  const encaissementChange = encaissementOrder && amountPaidInput
    ? Math.max(0, Math.round(parseFloat(amountPaidInput) * 100) - encaissementOrder.total)
    : 0

  // ========================================
  // Render: Loading
  // ========================================

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-bm-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-bm-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-stone-500 text-sm">Chargement...</p>
        </div>
      </div>
    )
  }

  // ========================================
  // Render
  // ========================================

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* ===== Top Bar ===== */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-stone-200/50 sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-bm-primary shadow-md shadow-bm-primary/20 flex items-center justify-center">
              <Bike className="w-5 h-5 text-stone-900" />
            </div>
            <div>
              <p className="font-black text-stone-900 text-base leading-tight">{user.name}</p>
              <p className="text-xs font-medium text-stone-500">Livreur</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Available toggle */}
            <button
              onClick={handleToggleAvailability}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors min-h-[36px] ${
                isAvailable
                  ? 'bg-green-100 text-green-700'
                  : 'bg-stone-100 text-stone-500'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-stone-400'}`} />
              {isAvailable ? 'Disponible' : 'Indisponible'}
            </button>

            {/* Schedule manager button */}
            <button
              onClick={() => setShowAvailabilityManager(true)}
              className="p-2 rounded-lg transition-colors text-stone-400 hover:text-bm-primary hover:bg-bm-primary-50"
              aria-label="Gérer les horaires"
              title="Gérer les horaires"
            >
              <Calendar className="w-5 h-5" />
            </button>

            {/* Push notification toggle */}
            <button
              onClick={handleTogglePush}
              className={`p-2 rounded-lg transition-colors ${
                pushEnabled
                  ? 'text-bm-primary hover:bg-bm-primary-50'
                  : 'text-stone-300 hover:text-stone-500'
              }`}
              aria-label={pushEnabled ? 'Notifications activees' : 'Notifications desactivees'}
              title={pushEnabled ? 'Notifications activees' : 'Notifications desactivees'}
            >
              {pushEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
            </button>

            {/* Refresh */}
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="p-2 text-stone-400 hover:text-bm-primary transition-colors"
              aria-label="Rafraîchir"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-2 text-stone-400 hover:text-red-500 transition-colors"
              aria-label="Déconnexion"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ===== Tabs ===== */}
      <nav className="bg-white/80 backdrop-blur-xl border-b border-stone-200/50 sticky top-[65px] z-20">
        <div className="max-w-lg mx-auto flex">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-bold transition-all relative min-h-[48px] ${
                activeTab === tab.key
                  ? 'text-bm-primary'
                  : 'text-stone-400 hover:text-stone-700'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
                  activeTab === tab.key
                    ? 'bg-bm-primary text-stone-900'
                    : tab.key === 'nouvelles'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-stone-200 text-stone-600'
                }`}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-bm-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* ===== Content ===== */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4">
        {activeTab === 'nouvelles' && (
          <NouvellesTab
            orders={pendingOrders}
            onAccept={handleAcceptOrder}
            onReject={(tokenId) => setRejectingToken(tokenId)}
            acceptingToken={acceptingToken}
          />
        )}
        {activeTab === 'acceptees' && (
          <AccepteesTab
            orders={acceptedOrders}
            calledOrders={calledOrders}
            onCall={handleCallClient}
            onValidate={handleValidateOrder}
            onReject={(tokenId) => setRejectingToken(tokenId)}
          />
        )}
        {activeTab === 'pretes' && (
          <PretesTab orders={readyOrders} onPickup={handlePickupOrder} />
        )}
        {activeTab === 'livrees' && (
          <LivreesTab orders={deliveredOrders} />
        )}
      </main>

      {/* ===== Encaissement Modal ===== */}
      {encaissementOrder && (
        <EncaissementModal
          order={encaissementOrder}
          amountPaidInput={amountPaidInput}
          setAmountPaidInput={setAmountPaidInput}
          change={encaissementChange}
          processing={processingPayment}
          onPaymentOk={handlePaymentOk}
          onOpenIssue={handleOpenIssue}
          onClose={() => { setEncaissementOrder(null); setAmountPaidInput('') }}
        />
      )}

      {/* ===== Issue Modal ===== */}
      {issueOrder && (
        <IssueModal
          order={issueOrder}
          motif={issueMotif}
          setMotif={setIssueMotif}
          amount={issueAmount}
          setAmount={setIssueAmount}
          note={issueNote}
          setNote={setIssueNote}
          submitting={submittingIssue}
          onSubmit={handleSubmitIssue}
          onClose={() => setIssueOrder(null)}
        />
      )}

      {/* ===== Reject Modal ===== */}
      {rejectingToken && (
        <RejectModal
          reason={rejectReason}
          setReason={setRejectReason}
          submitting={submittingReject}
          onSubmit={handleRejectOrder}
          onClose={() => { setRejectingToken(null); setRejectReason('') }}
        />
      )}

      {/* ===== Toast ===== */}
      {toast && (
        <div className={`fixed bottom-4 left-4 right-4 max-w-lg mx-auto z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === 'success'
            ? 'bg-green-600 text-white'
            : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      {/* ===== Availability Manager Modal ===== */}
      {showAvailabilityManager && user && (
        <AvailabilityManager
          userId={user.id}
          currentAvailability={isAvailable}
          currentSchedule={availabilitySchedule}
          onUpdate={handleUpdateSchedule}
          onClose={() => setShowAvailabilityManager(false)}
        />
      )}
    </div>
  )
}

// ========================================
// Tab: Nouvelles (PENDING - not yet accepted)
// ========================================

function NouvellesTab({
  orders,
  onAccept,
  onReject,
  acceptingToken,
}: {
  orders: OrderTempRedis[]
  onAccept: (token: string) => void
  onReject: (tokenId: string) => void
  acceptingToken: string | null
}) {
  if (orders.length === 0) {
    return <EmptyState icon={Clock} message="Aucune nouvelle commande" />
  }

  return (
    <div className="space-y-4">
      {orders.map(order => (
        <div key={order.tempToken} className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
          {/* Header with source badge + NEW pulse */}
          <div className="px-4 py-3 bg-bm-primary-50 border-b border-bm-primary-100 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-bm-primary text-stone-900 animate-pulse">
              🔴 Nouvelle
            </span>
            <span className="text-xs text-stone-400">
              <Clock className="w-3.5 h-3.5 inline mr-1" />
              {new Date(order.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3">
            {/* Client info */}
            <div>
              <p className="font-bold text-stone-900">{order.clientName}</p>
              <p className="text-sm text-bm-primary flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                {order.clientPhone}
              </p>
            </div>

            {/* Address */}
            <div className="flex items-start gap-1.5 text-sm text-stone-600">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-stone-400" />
              <span>{order.clientAddress}</span>
            </div>

            {/* Zone */}
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
              order.deliveryZone === 'Ville'
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              📍 {order.deliveryZone}
            </span>

            {/* Items */}
            <div className="space-y-1">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-stone-700">
                    {item.quantity}× {item.name}
                  </span>
                  <span className="text-stone-500">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
              {order.deliveryFee > 0 && (
                <div className="flex justify-between text-sm text-stone-400">
                  <span>Livraison</span>
                  <span>{formatPrice(order.deliveryFee)}</span>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="pt-2 border-t border-stone-100">
              <p className="text-xl font-bold text-stone-900 text-right">
                {formatPrice(order.total)}
              </p>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="bg-amber-50 rounded-lg p-2.5 text-sm text-amber-800">
                📝 {order.notes}
              </div>
            )}

            {/* Accept / Reject actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => onAccept(order.tempToken)}
                disabled={acceptingToken === order.tempToken}
                className="btn-bm-lg btn-bm-primary flex-1 gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {acceptingToken === order.tempToken ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
                    Acceptation...
                  </span>
                ) : (
                  <>
                    <HandMetal className="w-4 h-4" />
                    Accepter
                  </>
                )}
              </button>
              <button
                onClick={() => onReject(order.id)}
                className="btn-bm-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-4 text-sm"
              >
                ❌
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ========================================
// Tab: Acceptées (ACCEPTED by this livreur - Call → Validate flow)
// ========================================

function AccepteesTab({
  orders,
  calledOrders,
  onCall,
  onValidate,
  onReject,
}: {
  orders: OrderTempRedis[]
  calledOrders: Set<string>
  onCall: (phone: string, tokenId: string) => void
  onValidate: (token: string) => void
  onReject: (tokenId: string) => void
}) {
  if (orders.length === 0) {
    return <EmptyState icon={HandMetal} message="Aucune commande acceptée" />
  }

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
        <p className="font-semibold mb-1">📞 Appelez le client pour vérifier</p>
        <p className="text-xs text-blue-600">Après avoir appelé et confirmé les détails avec le client, cliquez sur &quot;Confirmer&quot; pour envoyer la commande à la cuisine.</p>
      </div>

      {orders.map(order => {
        const hasCalled = calledOrders.has(order.id)
        return (
          <div key={order.tempToken} className="bg-white rounded-2xl border-2 border-blue-200 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-600 text-white">
                ✋ Acceptée
              </span>
              <span className="text-xs text-stone-400">
                <Clock className="w-3.5 h-3.5 inline mr-1" />
                {new Date(order.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
              {/* Client info */}
              <div>
                <p className="font-bold text-stone-900">{order.clientName}</p>
                <a
                  href={`tel:${order.clientPhone}`}
                  className="text-sm text-bm-primary hover:underline flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {order.clientPhone}
                </a>
              </div>

              {/* Address */}
              <div className="flex items-start gap-1.5 text-sm text-stone-600">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-stone-400" />
                <span>{order.clientAddress}</span>
              </div>

              {/* Zone */}
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                order.deliveryZone === 'Ville'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                📍 {order.deliveryZone}
              </span>

              {/* Items */}
              <div className="space-y-1">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-stone-700">
                      {item.quantity}× {item.name}
                    </span>
                    <span className="text-stone-500">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
                {order.deliveryFee > 0 && (
                  <div className="flex justify-between text-sm text-stone-400">
                    <span>Livraison</span>
                    <span>{formatPrice(order.deliveryFee)}</span>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="pt-2 border-t border-stone-100">
                <p className="text-xl font-bold text-stone-900 text-right">
                  {formatPrice(order.total)}
                </p>
              </div>

              {/* Notes */}
              {order.notes && (
                <div className="bg-amber-50 rounded-lg p-2.5 text-sm text-amber-800">
                  📝 {order.notes}
                </div>
              )}

              {/* Actions: Call → Validate */}
              <div className="flex flex-col gap-2 pt-1">
                {!hasCalled ? (
                  <a
                    href={`tel:${order.clientPhone}`}
                    onClick={() => onCall(order.clientPhone, order.id)}
                    className="btn-bm-lg bg-blue-600 hover:bg-blue-700 text-white w-full gap-1.5 text-sm text-center"
                  >
                    📞 Appeler le client
                  </a>
                ) : (
                  <div className="flex gap-2">
                    <a
                      href={`tel:${order.clientPhone}`}
                      onClick={() => onCall(order.clientPhone, order.id)}
                      className="btn-bm-lg btn-bm-outline flex-1 gap-1.5 text-sm text-center"
                    >
                      📞 Rappeler
                    </a>
                    <button
                      onClick={() => onValidate(order.tempToken)}
                      className="btn-bm-lg bg-green-600 hover:bg-green-700 text-white flex-1 gap-1.5 text-sm"
                    >
                      ✅ Confirmer
                    </button>
                  </div>
                )}
                <button
                  onClick={() => onReject(order.id)}
                  className="btn-bm-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 w-full gap-1.5 text-sm"
                >
                  ❌ Refuser
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ========================================
// Tab: Prêtes (Ready for delivery)
// ========================================

function PretesTab({
  orders,
  onPickup,
}: {
  orders: Order[]
  onPickup: (order: Order) => void
}) {
  if (orders.length === 0) {
    return <EmptyState icon={CheckCircle} message="Aucune commande prête" />
  }

  return (
    <div className="space-y-4">
      {orders.map(order => (
        <OrderCard key={order.id} order={order}>
          <button
            onClick={() => onPickup(order)}
            className="btn-bm-lg btn-bm-primary w-full gap-2 text-sm"
          >
            🛵 Récupérer & Livrer
            <ChevronRight className="w-4 h-4" />
          </button>
        </OrderCard>
      ))}
    </div>
  )
}

// ========================================
// Tab: Livrées (Today's delivered)
// ========================================

function LivreesTab({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return <EmptyState icon={CheckCircle} message="Aucune livraison aujourd'hui" />
  }

  const totalRevenue = orders.reduce((sum, o) => sum + (o.amountPaid || 0), 0)

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-stone-500">Total aujourd'hui</span>
          <span className="text-lg font-bold text-stone-900">{orders.length} commandes</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-sm text-stone-500">Revenu</span>
          <span className="text-lg font-bold text-green-600">{formatPrice(totalRevenue)}</span>
        </div>
      </div>

      {orders.map(order => (
        <OrderCard key={order.id} order={order} compact>
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
            order.paymentStatus === 'PAID'
              ? 'bg-green-100 text-green-700'
              : order.paymentStatus === 'PARTIAL'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-stone-100 text-stone-600'
          }`}>
            {order.paymentStatus === 'PAID' ? '✅ Payé' : order.paymentStatus === 'PARTIAL' ? '⚠️ Partiel' : '⏳ En attente'}
          </span>
        </OrderCard>
      ))}
    </div>
  )
}

// ========================================
// Shared: Order Card
// ========================================

function OrderCard({
  order,
  children,
  compact = false,
}: {
  order: Order
  children?: React.ReactNode
  compact?: boolean
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
      <div className="p-4 space-y-3">
        {/* Header: order number + source */}
        <div className="flex items-center justify-between">
          <span className="font-bold text-bm-primary text-sm">{order.orderNumber}</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
            order.source === 'ONLINE'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-purple-100 text-purple-700'
          }`}>
            {order.source === 'ONLINE' ? '🌐 Online' : '📞 Téléphone'}
          </span>
        </div>

        {/* Client info */}
        {!compact && (
          <>
            <div>
              <p className="text-sm font-medium text-stone-900">{order.clientPhone}</p>
              <a
                href={`tel:${order.clientPhone}`}
                className="text-xs text-bm-primary hover:underline flex items-center gap-1"
              >
                <Phone className="w-3 h-3" />
                Appeler
              </a>
            </div>
            <div className="flex items-start gap-1.5 text-xs text-stone-500">
              <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{order.clientAddress}</span>
            </div>
          </>
        )}

        {/* Items */}
        <div className="space-y-0.5">
          {order.items.map(item => (
            <div key={item.id} className={`flex justify-between ${compact ? 'text-xs' : 'text-sm'}`}>
              <span className="text-stone-700">
                {item.quantity}× {item.product?.name || 'Produit'}
              </span>
              <span className="text-stone-500">{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
          <span className="text-sm text-stone-500">Total</span>
          <span className={`font-bold text-stone-900 ${compact ? 'text-base' : 'text-lg'}`}>
            {formatPrice(order.total)}
          </span>
        </div>

        {/* Children slot for actions/badges */}
        {children}
      </div>
    </div>
  )
}

// ========================================
// Empty State
// ========================================

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-stone-400">
      <Icon className="w-12 h-12 mb-3" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  )
}

// ========================================
// Encaissement Modal
// ========================================

function EncaissementModal({
  order,
  amountPaidInput,
  setAmountPaidInput,
  change,
  processing,
  onPaymentOk,
  onOpenIssue,
  onClose,
}: {
  order: Order
  amountPaidInput: string
  setAmountPaidInput: (v: string) => void
  change: number
  processing: boolean
  onPaymentOk: () => void
  onOpenIssue: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-bm-primary" />
            <h2 className="font-bold text-stone-900">Encaissement</h2>
          </div>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Order info */}
          <div className="text-center">
            <p className="text-sm text-stone-500">{order.orderNumber}</p>
            <p className="text-xs text-stone-400">{order.clientPhone} — {order.clientAddress}</p>
          </div>

          {/* Items summary */}
          <div className="bg-stone-50 rounded-xl p-3 space-y-1">
            {order.items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-stone-700">{item.quantity}× {item.product?.name}</span>
                <span className="text-stone-500">{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          {/* TOTAL */}
          <div className="text-center py-4 bg-bm-primary-50 rounded-2xl border-2 border-bm-primary">
            <p className="text-sm font-medium text-bm-primary-700 mb-1">TOTAL</p>
            <p className="text-4xl font-black text-bm-primary">
              {formatPrice(order.total)}
            </p>
          </div>

          {/* Amount paid input */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Client donne (DA) :
            </label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={amountPaidInput}
              onChange={e => setAmountPaidInput(e.target.value)}
              className="input-bm text-2xl font-bold text-center"
              min="0"
              step="50"
            />
          </div>

          {/* Change due */}
          {amountPaidInput && parseFloat(amountPaidInput) > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <p className="text-sm text-green-700 font-medium">Monnaie à rendre</p>
              <p className="text-2xl font-bold text-green-700">
                {formatPrice(change)}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={onPaymentOk}
              disabled={processing || !amountPaidInput || parseFloat(amountPaidInput) <= 0}
              className="btn-bm-lg bg-green-600 hover:bg-green-700 text-white w-full gap-2 text-base shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {processing ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Traitement...
                </span>
              ) : (
                <>
                  ✅ Paiement OK
                </>
              )}
            </button>
            <button
              onClick={onOpenIssue}
              disabled={processing}
              className="btn-bm-lg bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100 w-full gap-2 text-base"
            >
              ⚠️ Problème
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ========================================
// Issue Modal
// ========================================

function IssueModal({
  order,
  motif,
  setMotif,
  amount,
  setAmount,
  note,
  setNote,
  submitting,
  onSubmit,
  onClose,
}: {
  order: Order
  motif: PaymentIssue
  setMotif: (v: PaymentIssue) => void
  amount: string
  setAmount: (v: string) => void
  note: string
  setNote: (v: string) => void
  submitting: boolean
  onSubmit: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="font-bold text-stone-900">Signaler un problème</h2>
          </div>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Order reference */}
          <p className="text-sm text-stone-500">{order.orderNumber} — {formatPrice(order.total)}</p>

          {/* Motif selection */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Motif</label>
            <div className="space-y-2">
              {PAYMENT_ISSUE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setMotif(opt.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors min-h-[48px] ${
                    motif === opt.value
                      ? 'border-bm-primary bg-bm-primary-50 text-bm-primary'
                      : 'border-stone-200 text-stone-700 hover:border-stone-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount received */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Montant reçu (DA) :
            </label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="input-bm text-center font-bold"
              min="0"
              step="50"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Note (optionnel) :
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="Détails du problème..."
              className="input-bm resize-none"
            />
          </div>

          {/* Submit */}
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="btn-bm-lg bg-amber-500 hover:bg-amber-600 text-white w-full gap-2 text-base shadow-md disabled:opacity-50"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Envoi...
              </span>
            ) : (
              'Confirmer le signalement'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ========================================
// Reject Modal
// ========================================

function RejectModal({
  reason,
  setReason,
  submitting,
  onSubmit,
  onClose,
}: {
  reason: string
  setReason: (v: string) => void
  submitting: boolean
  onSubmit: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-stone-100">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <h2 className="font-bold text-stone-900">Refuser la commande</h2>
          </div>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Raison</label>
            <div className="space-y-2">
              {REJECT_REASONS.map(r => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors min-h-[48px] ${
                    reason === r
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-stone-200 text-stone-700 hover:border-stone-300'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={onSubmit}
            disabled={submitting || !reason}
            className="btn-bm-lg bg-red-600 hover:bg-red-700 text-white w-full gap-2 text-base shadow-md disabled:opacity-50"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Envoi...
              </span>
            ) : (
              'Confirmer le refus'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
