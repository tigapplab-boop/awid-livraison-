'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Clock, Truck, CheckCircle2, AlertCircle, Bell, BellOff, Settings, Eye, EyeOff, Save, X } from 'lucide-react'
import type { Order, OrderStatus } from '@/bm/types'
import { formatDA, formatTime, timeAgo } from '@/bm/lib/format'
import LiveursOnlinePanel from '@/components/admin/LiveursOnlinePanel'
import LivreurQuickCard from '@/components/admin/LivreurQuickCard'
import {
  connect,
  disconnect,
  joinAdminRoom,
  onOrderNew,
  onOrderStatusUpdate,
  onOrderReady,
  onOrderConfirmed,
  removeAllListeners as removeAllSocketListeners,
} from '@/bm/lib/socket'
import { subscribePush, isPushSubscribed, unsubscribePush } from '@/bm/lib/push-notifications'

const COLUMNS: { key: string; label: string; statuses: OrderStatus[]; color: string; bgColor: string; icon: React.ElementType }[] = [
  { key: 'new', label: 'Nouvelles', statuses: ['PENDING', 'CONFIRMED'], color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200', icon: AlertCircle },
  { key: 'preparing', label: 'En Préparation', statuses: ['PREPARING'], color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200', icon: Clock },
  { key: 'ready', label: 'Prêtes', statuses: ['READY'], color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  { key: 'delivered', label: 'Livrées', statuses: ['DELIVERED'], color: 'text-stone-500', bgColor: 'bg-stone-50 border-stone-200', icon: Truck },
]

function OrderCard({ order, onStatusChange }: { order: Order; onStatusChange: (id: string, status: OrderStatus) => void }) {
  const isDelivery = order.type === 'ONLINE' && order.deliveryFee > 0
  const isOnline = order.source === 'ONLINE'

  const getNextAction = () => {
    switch (order.status) {
      case 'PENDING':
      case 'CONFIRMED':
        return { label: 'Prendre en charge', nextStatus: 'PREPARING' as OrderStatus, className: 'bg-amber-500 hover:bg-amber-600 text-white' }
      case 'PREPARING':
        return { label: 'Marquer prête', nextStatus: 'READY' as OrderStatus, className: 'bg-emerald-500 hover:bg-emerald-600 text-white' }
      case 'READY':
        return { label: 'Marquer livrée', nextStatus: 'DELIVERED' as OrderStatus, className: 'bg-stone-500 hover:bg-stone-600 text-white' }
      default:
        return null
    }
  }

  const nextAction = getNextAction()

  return (
    <Card className="border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <span className="text-xl font-extrabold text-bm-primary">{order.orderNumber}</span>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-stone-400">{timeAgo(order.createdAt)}</span>
            <span className="text-[10px] text-stone-400">{formatTime(order.createdAt)}</span>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          {isDelivery ? (
            <Badge variant="default" className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5">
              🛵 Livraison
            </Badge>
          ) : (
            <Badge variant="default" className="bg-purple-500 text-white text-[10px] px-1.5 py-0.5">
              🏪 Sur place
            </Badge>
          )}
          {isOnline ? (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-emerald-300 text-emerald-600">
              🌐 Online
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-orange-300 text-orange-600">
              📞 Téléphone
            </Badge>
          )}
        </div>

        {/* Items */}
        <div className="space-y-1">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-stone-700">
                {item.quantity}× {item.product.name}
              </span>
              <span className="text-stone-500 font-medium">{formatDA(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="flex justify-between items-center pt-2 border-t border-dashed border-stone-200">
          <span className="text-sm font-semibold text-stone-600">Total</span>
          <span className="text-lg font-extrabold text-stone-900">{formatDA(order.total)}</span>
        </div>

        {/* Client info for delivery */}
        {isDelivery && (
          <div className="text-xs text-stone-500 bg-stone-50 rounded-lg p-2">
            <p className="font-medium text-stone-700">{order.clientPhone}</p>
            <p className="truncate">{order.clientAddress}</p>
            {order.assignedLivreur && (
              <p className="mt-1 text-blue-600">🛵 {order.assignedLivreur.name}</p>
            )}
          </div>
        )}

        {/* Actions */}
        {nextAction && (
          <Button
            onClick={() => onStatusChange(order.id, nextAction.nextStatus)}
            className={`w-full min-h-[48px] font-bold text-sm ${nextAction.className}`}
          >
            {nextAction.label}
          </Button>
        )}

        {order.status === 'DELIVERED' && (
          <div className="text-center">
            <Badge className="bg-emerald-100 text-emerald-700 border-0">
              ✓ Livrée
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ========================================
// Settings Section
// ========================================

interface UserItem {
  id: string
  name: string
  phone: string | null
  role: string
  isAvailable: boolean
}

function SettingsSection({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('bm_token')
      if (!token) return
      const res = await fetch('/api/settings', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      setUsers(data)
    } catch (err) {
      showToast('error', 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  const startEdit = (user: UserItem) => {
    setEditingId(user.id)
    setEditName(user.name)
    setEditPhone(user.phone || '')
    setEditPassword('')
    setShowPassword(false)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditPhone('')
    setEditPassword('')
  }

  const handleSave = async () => {
    if (!editingId) return
    setSaving(true)
    try {
      const token = localStorage.getItem('bm_token')
      if (!token) return
      const body: Record<string, string> = { userId: editingId }
      if (editName) body.name = editName
      if (editPhone) body.phone = editPhone
      if (editPassword) body.password = editPassword

      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }

      showToast('success', 'Informations mises à jour ✓')
      setEditingId(null)
      fetchUsers()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const admins = users.filter(u => u.role === 'ADMIN')
  const livreurs = users.filter(u => u.role === 'LIVREUR')

  return (
    <div className="fixed inset-0 z-50 bg-stone-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-stone-200 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-bm-primary" />
            <h1 className="text-xl font-extrabold text-stone-900">Gestion des Comptes</h1>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-bm-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Admin accounts */}
            <div>
              <h2 className="text-sm font-bold text-stone-700 uppercase tracking-wider mb-3">
                Compte Admin / Cuisine
              </h2>
              <div className="space-y-3">
                {admins.map(user => (
                  <div key={user.id} className="bg-white rounded-xl border border-stone-200 p-4">
                    {editingId === user.id ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-stone-500 mb-1">Nom</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="input-bm"
                            placeholder="Nom d'utilisateur"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-stone-500 mb-1">Identifiant (téléphone)</label>
                          <input
                            type="text"
                            value={editPhone}
                            onChange={e => setEditPhone(e.target.value)}
                            className="input-bm"
                            placeholder="Identifiant de connexion"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-stone-500 mb-1">Nouveau mot de passe</label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={editPassword}
                              onChange={e => setEditPassword(e.target.value)}
                              className="input-bm pr-10"
                              placeholder="Laisser vide pour ne pas changer"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="btn-bm-lg btn-bm-primary flex-1 gap-1.5 text-sm disabled:opacity-50"
                          >
                            {saving ? (
                              <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
                                Sauvegarde...
                              </span>
                            ) : (
                              <>
                                <Save className="w-4 h-4" />
                                Sauvegarder
                              </>
                            )}
                          </button>
                          <button onClick={cancelEdit} className="btn-bm-lg bg-stone-100 text-stone-600 hover:bg-stone-200 px-4 text-sm">
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-stone-900">{user.name}</p>
                          <p className="text-sm text-stone-500">Identifiant : {user.phone || user.name}</p>
                          <Badge className="mt-1 bg-bm-primary-50 text-bm-primary border-0 text-[10px]">Admin</Badge>
                        </div>
                        <button onClick={() => startEdit(user)} className="btn-bm-lg btn-bm-outline text-sm gap-1.5">
                          <Settings className="w-4 h-4" />
                          Modifier
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Livreur accounts */}
            <div>
              <h2 className="text-sm font-bold text-stone-700 uppercase tracking-wider mb-3">
                Comptes Livreurs
              </h2>
              <div className="space-y-3">
                {livreurs.map(user => (
                  <div key={user.id} className="bg-white rounded-xl border border-stone-200 p-4">
                    {editingId === user.id ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-stone-500 mb-1">Nom</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="input-bm"
                            placeholder="Nom du livreur"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-stone-500 mb-1">Identifiant (téléphone)</label>
                          <input
                            type="text"
                            value={editPhone}
                            onChange={e => setEditPhone(e.target.value)}
                            className="input-bm"
                            placeholder="Identifiant de connexion"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-stone-500 mb-1">Nouveau mot de passe</label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={editPassword}
                              onChange={e => setEditPassword(e.target.value)}
                              className="input-bm pr-10"
                              placeholder="Laisser vide pour ne pas changer"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="btn-bm-lg btn-bm-primary flex-1 gap-1.5 text-sm disabled:opacity-50"
                          >
                            {saving ? (
                              <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
                                Sauvegarde...
                              </span>
                            ) : (
                              <>
                                <Save className="w-4 h-4" />
                                Sauvegarder
                              </>
                            )}
                          </button>
                          <button onClick={cancelEdit} className="btn-bm-lg bg-stone-100 text-stone-600 hover:bg-stone-200 px-4 text-sm">
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-stone-900">{user.name}</p>
                          <p className="text-sm text-stone-500">Identifiant : {user.phone || user.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-amber-50 text-amber-700 border-0 text-[10px]">Livreur</Badge>
                            <Badge className={`${user.isAvailable ? 'bg-green-50 text-green-700' : 'bg-stone-50 text-stone-500'} border-0 text-[10px]`}>
                              {user.isAvailable ? 'Disponible' : 'Indisponible'}
                            </Badge>
                          </div>
                        </div>
                        <button onClick={() => startEdit(user)} className="btn-bm-lg btn-bm-outline text-sm gap-1.5">
                          <Settings className="w-4 h-4" />
                          Modifier
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 left-4 right-4 max-w-lg mx-auto z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === 'success'
            ? 'bg-green-600 text-white'
            : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toast.message}
        </div>
      )}
    </div>
  )
}

// ========================================
// Main Dashboard
// ========================================

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pushEnabled, setPushEnabled] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const fetchOrders = useCallback(async () => {
    try {
      const token = localStorage.getItem('bm_token')
      if (!token) return

      const res = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Failed to fetch orders')
      const data = await res.json()
      setOrders(data)
      setError('')
    } catch {
      setError('Erreur lors du chargement des commandes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 15000)
    return () => clearInterval(interval)
  }, [fetchOrders])

  // ========================================
  // Socket.IO + Push Notifications
  // ========================================

  useEffect(() => {
    // Connect to Socket.IO and join admin room
    connect()
    joinAdminRoom()

    // Listen for new orders
    onOrderNew(() => {
      showToast('success', 'Nouvelle commande !')
      fetchOrders()
    })

    // Listen for status changes
    onOrderStatusUpdate((data) => {
      showToast('success', `Commande mise a jour : ${data.status}`)
      fetchOrders()
    })

    // Listen for confirmed orders
    onOrderConfirmed((data) => {
      showToast('success', `Commande ${data.orderNumber} confirmee`)
      fetchOrders()
    })

    // Listen for ready orders
    onOrderReady((data) => {
      showToast('success', `Commande ${data.orderNumber} prete`)
      fetchOrders()
    })

    // Subscribe to push notifications
    const userStr = localStorage.getItem('bm_user')
    let userId: string | undefined
    if (userStr) {
      try {
        userId = JSON.parse(userStr).id
      } catch {}
    }
    const initPush = async () => {
      try {
        const subscribed = await isPushSubscribed()
        setPushEnabled(subscribed)
        if (!subscribed && userId) {
          const result = await subscribePush(userId)
          setPushEnabled(!!result)
        }
      } catch (err) {
        console.warn('[Push] Could not subscribe:', err)
      }
    }
    initPush()

    // Register service worker if not already
    if ('serviceWorker' in navigator && !navigator.serviceWorker.controller) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    return () => {
      removeAllSocketListeners()
      disconnect()
    }
  }, [fetchOrders])

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const handleTogglePush = async () => {
    const userStr = localStorage.getItem('bm_user')
    let userId: string | undefined
    if (userStr) {
      try { userId = JSON.parse(userStr).id } catch {}
    }
    if (pushEnabled) {
      const result = await unsubscribePush()
      setPushEnabled(!result)
      if (result) {
        showToast('success', 'Notifications desactivées')
      }
    } else if (userId) {
      const result = await subscribePush(userId)
      setPushEnabled(!!result)
      if (result) {
        showToast('success', 'Notifications push activées')
      }
    }
  }

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const token = localStorage.getItem('bm_token')
      if (!token) return

      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }

      // Optimistically update local state
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      )
    } catch (err) {
      console.error('Status change error:', err)
      // Refetch on error
      fetchOrders()
    }
  }

  const getOrdersForColumn = (statuses: OrderStatus[]) => {
    return orders.filter((o) => statuses.includes(o.status as OrderStatus))
  }

  const handleLogout = () => {
    disconnect()
    localStorage.removeItem('bm_token')
    localStorage.removeItem('bm_user')
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-48 bg-stone-200 rounded-lg animate-pulse" />
          <div className="h-10 w-10 bg-stone-200 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-10 bg-stone-200 rounded-lg animate-pulse" />
              {[0, 1].map((j) => (
                <div key={j} className="h-48 bg-stone-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="p-4 lg:p-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-stone-900">Commandes</h1>
            <p className="text-sm text-stone-500 mt-1">
              {orders.length} commande{orders.length !== 1 ? 's' : ''} aujourd&apos;hui
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowSettings(true)}
              variant="outline"
              className="min-h-[48px] border-bm-primary text-bm-primary hover:bg-bm-primary-50"
            >
              <Settings className="h-4 w-4 mr-2" />
              Paramètres
            </Button>
            <Button
              onClick={handleTogglePush}
              variant="outline"
              className={`min-h-[48px] ${pushEnabled ? 'border-bm-primary text-bm-primary' : 'border-stone-300 text-stone-400'}`}
              title={pushEnabled ? 'Notifications activees' : 'Notifications desactivees'}
            >
              {pushEnabled ? <Bell className="h-4 w-4 mr-2" /> : <BellOff className="h-4 w-4 mr-2" />}
              {pushEnabled ? 'Notifs ON' : 'Notifs OFF'}
            </Button>
            <Button
              onClick={fetchOrders}
              variant="outline"
              className="min-h-[48px] border-bm-primary text-bm-primary hover:bg-bm-primary-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Rafraîchir
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="min-h-[48px] border-red-300 text-red-500 hover:bg-red-50"
            >
              Déconnexion
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Livreurs Online Panel */}
        <div className="mb-6">
          <LiveursOnlinePanel />
        </div>

        {/* Kanban Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 overflow-auto">
          {COLUMNS.map((col) => {
            const Icon = col.icon
            const colOrders = getOrdersForColumn(col.statuses)
            return (
              <div key={col.key} className="flex flex-col min-h-0">
                {/* Column Header */}
                <div className={`rounded-xl border-2 px-4 py-3 mb-3 ${col.bgColor}`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${col.color}`} />
                    <span className={`font-bold text-sm ${col.color}`}>{col.label}</span>
                    <span className={`ml-auto text-xs font-bold ${col.color} bg-white/60 rounded-full px-2 py-0.5`}>
                      {colOrders.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-240px)] pr-1 custom-scrollbar">
                  {colOrders.length === 0 ? (
                    <div className="text-center py-8 text-stone-400 text-sm">
                      Aucune commande
                    </div>
                  ) : (
                    colOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onStatusChange={handleStatusChange}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Toast Notification */}
        {toast && (
          <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {toast.message}
          </div>
        )}
      </div>

      {/* Settings overlay */}
      {showSettings && (
        <SettingsSection onClose={() => setShowSettings(false)} />
      )}
    </>
  )
}
