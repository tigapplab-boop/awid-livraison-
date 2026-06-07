// ========================================
// AWID / BURGER MINUTE - In-Memory Temp Order Store
// Replaces Redis for SQLite/dev environment
// Flow: PENDING → ACCEPTED (livreur claims) → VALIDATED (after call verification)
// ========================================

import { v4 as uuidv4 } from 'uuid'
import type { TempOrderStatus, OrderTempRedis } from '@/bm/types'

export type { TempOrderStatus, OrderTempRedis }

// Global in-memory store - use globalThis to persist across hot reloads
const globalForStore = globalThis as unknown as {
  orderStore: Map<string, OrderTempRedis> | undefined
  phoneIndex: Map<string, string> | undefined
  cleanupTimer: ReturnType<typeof setInterval> | undefined
}

const orderStore = globalForStore.orderStore ?? new Map<string, OrderTempRedis>()
const phoneIndex = globalForStore.phoneIndex ?? new Map<string, string>()

globalForStore.orderStore = orderStore
globalForStore.phoneIndex = phoneIndex

// Cleanup expired orders every 60 seconds (HMR-safe)
if (typeof globalThis !== 'undefined' && !globalForStore.cleanupTimer) {
  const cleanup = () => {
    const now = new Date()
    for (const [token, order] of orderStore.entries()) {
      if (new Date(order.expiresAt) <= now && (order.status === 'PENDING' || order.status === 'ACCEPTED')) {
        order.status = 'EXPIRED'
        phoneIndex.delete(order.clientPhone)
      }
    }
  }
  // Use setInterval only on server side, guard against HMR duplication
  if (typeof setInterval !== 'undefined') {
    globalForStore.cleanupTimer = setInterval(cleanup, 60000)
    // Allow the process to exit even if the timer is still running
    if (globalForStore.cleanupTimer && typeof globalForStore.cleanupTimer === 'object' && 'unref' in globalForStore.cleanupTimer) {
      globalForStore.cleanupTimer.unref()
    }
  }
}

export function createTempOrder(params: {
  clientPhone: string
  clientName: string
  clientAddress: string
  deliveryZone: string
  deliveryZoneId: string
  items: Array<{
    productId: string
    name: string
    quantity: number
    price: number
    notes?: string
  }>
  subtotal: number
  deliveryFee: number
  isNightDelivery: boolean
  livreurId: string | null
  notes?: string
}): { action: 'CREATED'; tempToken: string; orderTemp: OrderTempRedis } | { action: 'EXISTING_PENDING'; existingOrder: OrderTempRedis } {
  // Check for existing pending/accepted order for this phone
  const existingToken = phoneIndex.get(params.clientPhone)
  if (existingToken) {
    const existing = orderStore.get(existingToken)
    if (existing && (existing.status === 'PENDING' || existing.status === 'ACCEPTED') && new Date(existing.expiresAt) > new Date()) {
      return { action: 'EXISTING_PENDING', existingOrder: existing }
    }
    // Clean up expired/old entry
    phoneIndex.delete(params.clientPhone)
  }

  const id = uuidv4()
  const tempToken = uuidv4()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000) // 15 minutes

  const orderTemp: OrderTempRedis = {
    id,
    tempToken,
    clientPhone: params.clientPhone,
    clientName: params.clientName,
    clientAddress: params.clientAddress,
    deliveryZone: params.deliveryZone,
    deliveryZoneId: params.deliveryZoneId,
    items: params.items,
    subtotal: params.subtotal,
    deliveryFee: params.deliveryFee,
    isNightDelivery: params.isNightDelivery,
    total: params.subtotal + params.deliveryFee,
    status: 'PENDING',
    livreurId: null, // No auto-assignment - first livreur to accept claims it
    acceptedByLivreurId: null,
    acceptedAt: null,
    version: 1,
    previousId: null,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    notes: params.notes,
  }

  orderStore.set(tempToken, orderTemp)
  phoneIndex.set(params.clientPhone, tempToken)

  return { action: 'CREATED', tempToken, orderTemp }
}

export function getTempOrderByToken(token: string): OrderTempRedis | null {
  const order = orderStore.get(token)
  if (!order) return null
  // Check expiry
  if (new Date(order.expiresAt) <= new Date() && (order.status === 'PENDING' || order.status === 'ACCEPTED')) {
    order.status = 'EXPIRED'
    phoneIndex.delete(order.clientPhone)
  }
  return order
}

export function getPendingOrderByPhone(phone: string): OrderTempRedis | null {
  const token = phoneIndex.get(phone)
  if (!token) return null
  return getTempOrderByToken(token)
}

export function updateTempOrderStatus(token: string, status: TempOrderStatus): OrderTempRedis | null {
  const order = orderStore.get(token)
  if (!order) return null
  order.status = status
  if (status === 'CANCELLED' || status === 'REJECTED' || status === 'REPLACED' || status === 'VALIDATED' || status === 'EXPIRED') {
    phoneIndex.delete(order.clientPhone)
  }
  return order
}

// ========================================
// Accept temp order - first livreur claims it
// Returns null if already accepted by another livreur
// ========================================
export function acceptTempOrder(token: string, livreurId: string): OrderTempRedis | null {
  const order = orderStore.get(token)
  if (!order) return null

  // Only PENDING orders can be accepted
  if (order.status !== 'PENDING') return null

  // Check expiry
  if (new Date(order.expiresAt) <= new Date()) {
    order.status = 'EXPIRED'
    phoneIndex.delete(order.clientPhone)
    return null
  }

  order.status = 'ACCEPTED'
  order.acceptedByLivreurId = livreurId
  order.livreurId = livreurId
  order.acceptedAt = new Date().toISOString()

  return order
}

export function replaceTempOrder(token: string, updates: {
  items: Array<{ productId: string; name: string; quantity: number; price: number; notes?: string }>
  clientName?: string
  clientAddress?: string
  deliveryZone?: string
  deliveryZoneId?: string
  notes?: string
}): OrderTempRedis | null {
  const oldOrder = orderStore.get(token)
  if (!oldOrder) return null

  // Mark old as REPLACED
  oldOrder.status = 'REPLACED'
  phoneIndex.delete(oldOrder.clientPhone)

  // Create new version
  const id = uuidv4()
  const newToken = uuidv4()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000)

  const subtotal = updates.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  // Recalculate delivery fee if zone changed - keep old fee for simplicity
  const deliveryFee = oldOrder.deliveryFee

  const newOrder: OrderTempRedis = {
    id,
    tempToken: newToken,
    clientPhone: oldOrder.clientPhone,
    clientName: updates.clientName ?? oldOrder.clientName,
    clientAddress: updates.clientAddress ?? oldOrder.clientAddress,
    deliveryZone: updates.deliveryZone ?? oldOrder.deliveryZone,
    deliveryZoneId: updates.deliveryZoneId ?? oldOrder.deliveryZoneId,
    items: updates.items,
    subtotal,
    deliveryFee,
    isNightDelivery: oldOrder.isNightDelivery,
    total: subtotal + deliveryFee,
    status: 'PENDING',
    livreurId: oldOrder.livreurId,
    acceptedByLivreurId: oldOrder.acceptedByLivreurId,
    acceptedAt: oldOrder.acceptedAt,
    version: oldOrder.version + 1,
    previousId: oldOrder.id,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    notes: updates.notes ?? oldOrder.notes,
  }

  orderStore.set(newToken, newOrder)
  phoneIndex.set(oldOrder.clientPhone, newToken)

  return newOrder
}

export function cancelAndCreate(token: string, params: {
  clientPhone: string
  clientName: string
  clientAddress: string
  deliveryZone: string
  deliveryZoneId: string
  items: Array<{ productId: string; name: string; quantity: number; price: number; notes?: string }>
  subtotal: number
  deliveryFee: number
  isNightDelivery: boolean
  livreurId: string | null
  notes?: string
}): OrderTempRedis | null {
  const oldOrder = orderStore.get(token)
  if (!oldOrder) return null

  // Cancel old
  oldOrder.status = 'CANCELLED'
  phoneIndex.delete(oldOrder.clientPhone)

  // Create new
  const id = uuidv4()
  const tempToken = uuidv4()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000)

  const newOrder: OrderTempRedis = {
    id,
    tempToken,
    clientPhone: params.clientPhone,
    clientName: params.clientName,
    clientAddress: params.clientAddress,
    deliveryZone: params.deliveryZone,
    deliveryZoneId: params.deliveryZoneId,
    items: params.items,
    subtotal: params.subtotal,
    deliveryFee: params.deliveryFee,
    isNightDelivery: params.isNightDelivery,
    total: params.subtotal + params.deliveryFee,
    status: 'PENDING',
    livreurId: null,
    acceptedByLivreurId: null,
    acceptedAt: null,
    version: 1,
    previousId: null,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    notes: params.notes,
  }

  orderStore.set(tempToken, newOrder)
  phoneIndex.set(params.clientPhone, tempToken)

  return newOrder
}

// Get orders available for a specific livreur (PENDING for all + ACCEPTED by this livreur)
export function getAvailableTempOrders(livreurId?: string): OrderTempRedis[] {
  const result: OrderTempRedis[] = []
  for (const order of orderStore.values()) {
    // Check expiry
    if (new Date(order.expiresAt) <= new Date() && (order.status === 'PENDING' || order.status === 'ACCEPTED')) {
      order.status = 'EXPIRED'
      phoneIndex.delete(order.clientPhone)
      continue
    }
    // PENDING orders are visible to all livreurs
    if (order.status === 'PENDING') {
      result.push(order)
    }
    // ACCEPTED orders are only visible to the livreur who accepted them
    if (order.status === 'ACCEPTED' && livreurId && order.acceptedByLivreurId === livreurId) {
      result.push(order)
    }
  }
  // Sort by creation time ascending (oldest first)
  return result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

export function getAllPendingTempOrders(): OrderTempRedis[] {
  const pending: OrderTempRedis[] = []
  for (const order of orderStore.values()) {
    // Check expiry
    if (new Date(order.expiresAt) <= new Date() && (order.status === 'PENDING' || order.status === 'ACCEPTED')) {
      order.status = 'EXPIRED'
      phoneIndex.delete(order.clientPhone)
    }
    if (order.status === 'PENDING' || order.status === 'ACCEPTED') {
      pending.push(order)
    }
  }
  // Sort by creation time ascending (oldest first)
  return pending.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

export function deleteTempOrder(token: string): boolean {
  const order = orderStore.get(token)
  if (!order) return false
  phoneIndex.delete(order.clientPhone)
  orderStore.delete(token)
  return true
}
