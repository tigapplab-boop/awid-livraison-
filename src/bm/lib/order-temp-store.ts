import { v4 as uuidv4 } from 'uuid'
import type { TempOrderStatus, OrderTempRedis } from '@/bm/types'
import { redis } from './redis'

export type { TempOrderStatus, OrderTempRedis }

const EXPIRY_SECONDS = 15 * 60 // 15 mins for pending
const HISTORY_EXPIRY_SECONDS = 3600 // 1 hour for processed

const ORDER_PREFIX = 'temp_order:'
const PHONE_PREFIX = 'phone_index:'
const SET_KEY = 'temp_orders_set'

export async function createTempOrder(params: any): Promise<{ action: 'CREATED'; tempToken: string; orderTemp: OrderTempRedis } | { action: 'EXISTING_PENDING'; existingOrder: OrderTempRedis }> {
  const existingToken = await redis.get(`${PHONE_PREFIX}${params.clientPhone}`)
  if (existingToken) {
    const existingStr = await redis.get(`${ORDER_PREFIX}${existingToken}`)
    if (existingStr) {
      const existing: OrderTempRedis = JSON.parse(existingStr)
      if ((existing.status === 'PENDING' || existing.status === 'ACCEPTED') && new Date(existing.expiresAt) > new Date()) {
        return { action: 'EXISTING_PENDING', existingOrder: existing }
      }
      // cleanup old if expired
      await redis.del(`${PHONE_PREFIX}${params.clientPhone}`)
    }
  }

  const id = uuidv4()
  const tempToken = uuidv4()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + EXPIRY_SECONDS * 1000)

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
    livreurId: null,
    acceptedByLivreurId: null,
    acceptedAt: null,
    version: 1,
    previousId: null,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    notes: params.notes,
  }

  const pipe = redis.pipeline()
  pipe.setex(`${ORDER_PREFIX}${tempToken}`, EXPIRY_SECONDS, JSON.stringify(orderTemp))
  pipe.setex(`${PHONE_PREFIX}${params.clientPhone}`, EXPIRY_SECONDS, tempToken)
  pipe.sadd(SET_KEY, tempToken)
  await pipe.exec()

  return { action: 'CREATED', tempToken, orderTemp }
}

export async function getTempOrderByToken(token: string): Promise<OrderTempRedis | null> {
  const str = await redis.get(`${ORDER_PREFIX}${token}`)
  if (!str) return null
  const order: OrderTempRedis = JSON.parse(str)
  
  if (new Date(order.expiresAt) <= new Date() && (order.status === 'PENDING' || order.status === 'ACCEPTED')) {
    order.status = 'EXPIRED'
    await redis.del(`${PHONE_PREFIX}${order.clientPhone}`)
    await redis.setex(`${ORDER_PREFIX}${token}`, HISTORY_EXPIRY_SECONDS, JSON.stringify(order))
  }
  return order
}

export async function getPendingOrderByPhone(phone: string): Promise<OrderTempRedis | null> {
  const token = await redis.get(`${PHONE_PREFIX}${phone}`)
  if (!token) return null
  return getTempOrderByToken(token)
}

export async function updateTempOrderStatus(token: string, status: TempOrderStatus): Promise<OrderTempRedis | null> {
  const order = await getTempOrderByToken(token)
  if (!order) return null
  
  order.status = status
  const pipe = redis.pipeline()
  if (status === 'CANCELLED' || status === 'REJECTED' || status === 'REPLACED' || status === 'VALIDATED' || status === 'EXPIRED') {
    pipe.del(`${PHONE_PREFIX}${order.clientPhone}`)
    pipe.setex(`${ORDER_PREFIX}${token}`, HISTORY_EXPIRY_SECONDS, JSON.stringify(order))
  } else {
    pipe.setex(`${ORDER_PREFIX}${token}`, EXPIRY_SECONDS, JSON.stringify(order))
  }
  await pipe.exec()
  
  return order
}

export async function acceptTempOrder(token: string, livreurId: string): Promise<OrderTempRedis | null> {
  // Using redis transaction for concurrent accept guard
  const lockKey = `lock:accept:${token}`
  const acquired = await redis.set(lockKey, livreurId, 'EX', 10, 'NX')
  if (!acquired) return null
  
  try {
    const order = await getTempOrderByToken(token)
    if (!order) return null
    if (order.status !== 'PENDING') return null
    if (new Date(order.expiresAt) <= new Date()) {
      order.status = 'EXPIRED'
      await redis.del(`${PHONE_PREFIX}${order.clientPhone}`)
      await redis.setex(`${ORDER_PREFIX}${token}`, HISTORY_EXPIRY_SECONDS, JSON.stringify(order))
      return null
    }

    order.status = 'ACCEPTED'
    order.acceptedByLivreurId = livreurId
    order.livreurId = livreurId
    order.acceptedAt = new Date().toISOString()
    
    await redis.setex(`${ORDER_PREFIX}${token}`, EXPIRY_SECONDS, JSON.stringify(order))
    return order
  } finally {
    await redis.del(lockKey)
  }
}

export async function replaceTempOrder(token: string, updates: any): Promise<OrderTempRedis | null> {
  const oldOrder = await getTempOrderByToken(token)
  if (!oldOrder) return null

  oldOrder.status = 'REPLACED'
  const pipe = redis.pipeline()
  pipe.del(`${PHONE_PREFIX}${oldOrder.clientPhone}`)
  pipe.setex(`${ORDER_PREFIX}${token}`, HISTORY_EXPIRY_SECONDS, JSON.stringify(oldOrder))

  const id = uuidv4()
  const newToken = uuidv4()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + EXPIRY_SECONDS * 1000)
  const subtotal = updates.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0)
  
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
    deliveryFee: oldOrder.deliveryFee,
    isNightDelivery: oldOrder.isNightDelivery,
    total: subtotal + oldOrder.deliveryFee,
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

  pipe.setex(`${ORDER_PREFIX}${newToken}`, EXPIRY_SECONDS, JSON.stringify(newOrder))
  pipe.setex(`${PHONE_PREFIX}${oldOrder.clientPhone}`, EXPIRY_SECONDS, newToken)
  pipe.sadd(SET_KEY, newToken)
  await pipe.exec()

  return newOrder
}

export async function cancelAndCreate(token: string, params: any): Promise<OrderTempRedis | null> {
  const oldOrder = await getTempOrderByToken(token)
  if (!oldOrder) return null

  oldOrder.status = 'CANCELLED'
  const pipe = redis.pipeline()
  pipe.del(`${PHONE_PREFIX}${oldOrder.clientPhone}`)
  pipe.setex(`${ORDER_PREFIX}${token}`, HISTORY_EXPIRY_SECONDS, JSON.stringify(oldOrder))

  const id = uuidv4()
  const tempToken = uuidv4()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + EXPIRY_SECONDS * 1000)

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

  pipe.setex(`${ORDER_PREFIX}${tempToken}`, EXPIRY_SECONDS, JSON.stringify(newOrder))
  pipe.setex(`${PHONE_PREFIX}${params.clientPhone}`, EXPIRY_SECONDS, tempToken)
  pipe.sadd(SET_KEY, tempToken)
  await pipe.exec()

  return newOrder
}

async function getAllOrders(): Promise<OrderTempRedis[]> {
  const tokens = await redis.smembers(SET_KEY)
  if (tokens.length === 0) return []
  
  const keys = tokens.map(t => `${ORDER_PREFIX}${t}`)
  const values = await redis.mget(keys)
  
  const validTokens: string[] = []
  const result: OrderTempRedis[] = []
  
  for (let i = 0; i < tokens.length; i++) {
    const val = values[i]
    if (val) {
      const order: OrderTempRedis = JSON.parse(val)
      validTokens.push(tokens[i])
      
      if (new Date(order.expiresAt) <= new Date() && (order.status === 'PENDING' || order.status === 'ACCEPTED')) {
        order.status = 'EXPIRED'
        await redis.del(`${PHONE_PREFIX}${order.clientPhone}`)
        await redis.setex(`${ORDER_PREFIX}${order.tempToken}`, HISTORY_EXPIRY_SECONDS, JSON.stringify(order))
      }
      
      result.push(order)
    } else {
      await redis.srem(SET_KEY, tokens[i])
    }
  }
  
  return result
}

export async function getAvailableTempOrders(livreurId?: string): Promise<OrderTempRedis[]> {
  const orders = await getAllOrders()
  const result = orders.filter(order => {
    if (order.status === 'PENDING') return true
    if (order.status === 'ACCEPTED' && livreurId && order.acceptedByLivreurId === livreurId) return true
    return false
  })
  return result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

export async function getAllPendingTempOrders(): Promise<OrderTempRedis[]> {
  const orders = await getAllOrders()
  const pending = orders.filter(o => o.status === 'PENDING' || o.status === 'ACCEPTED')
  return pending.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

export async function deleteTempOrder(token: string): Promise<boolean> {
  const order = await getTempOrderByToken(token)
  if (!order) return false
  await redis.del(`${PHONE_PREFIX}${order.clientPhone}`)
  await redis.del(`${ORDER_PREFIX}${token}`)
  await redis.srem(SET_KEY, token)
  return true
}
