// ========================================
// AWID / BURGER MINUTE - Livreur API Client
// Authenticated API calls for delivery drivers
// ========================================

import type { Order, OrderTempRedis, OrderSource } from '@/bm/types'
import { formatPrice } from '@/bm/lib/format'

const API_BASE = '/api'

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem('bm_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...options?.headers,
      },
    })

    clearTimeout(timeoutId)

    if (res.status === 401) {
      // Token expired or invalid
      if (typeof window !== 'undefined') {
        localStorage.removeItem('bm_token')
        localStorage.removeItem('bm_user')
        window.location.href = '/login'
      }
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || 'Erreur serveur')
    }

    return data as T
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error("Délai d'attente dépassé. Vérifiez votre connexion.")
    }
    throw error
  }
}

// ========================================
// Auth
// ========================================

export interface LoginResponse {
  token: string
  user: {
    id: string
    name: string
    phone: string
    role: string
    isAvailable: boolean
  }
}

export async function login(phone: string, password: string): Promise<LoginResponse> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    const res = await fetch(`${API_BASE}/auth`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    })

    clearTimeout(timeoutId)

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || 'Identifiants invalides')
    }

    return data as LoginResponse
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error("Délai d'attente dépassé. Vérifiez votre connexion.")
    }
    throw error
  }
}

// ========================================
// Temp Orders (Nouvelles)
// ========================================

export async function getPendingTempOrders(): Promise<OrderTempRedis[]> {
  return apiFetch<OrderTempRedis[]>('/orders-temp')
}

export async function acceptTempOrder(token: string): Promise<{ order: OrderTempRedis; message: string }> {
  return apiFetch<{ order: OrderTempRedis; message: string }>(`/orders-temp/${token}/accept`, {
    method: 'PATCH',
  })
}

export async function validateTempOrder(token: string): Promise<{ order: Order; clientToken: string }> {
  return apiFetch<{ order: Order; clientToken: string }>(`/orders-temp/${token}/validate`, {
    method: 'PATCH',
  })
}

export async function rejectTempOrder(token: string): Promise<{ status: string }> {
  return apiFetch<{ status: string }>(`/orders-temp/${token}/reject`, {
    method: 'PATCH',
  })
}

// ========================================
// Orders
// ========================================

export async function getOrders(params?: {
  status?: string
  livreurId?: string
  source?: string
}): Promise<Order[]> {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set('status', params.status)
  if (params?.livreurId) searchParams.set('livreurId', params.livreurId)
  if (params?.source) searchParams.set('source', params.source)
  const qs = searchParams.toString()
  return apiFetch<Order[]>(`/orders${qs ? `?${qs}` : ''}`)
}

export async function getOrderById(id: string): Promise<Order> {
  return apiFetch<Order>(`/orders/${id}`)
}

export async function updateOrderStatus(
  id: string,
  data: {
    status?: string
    amountPaid?: number
    changeDue?: number
    paymentIssue?: string
    paymentIssueNote?: string
    cancelReason?: string
  }
): Promise<Order> {
  return apiFetch<Order>(`/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// ========================================
// Re-export formatPrice for convenience
// ========================================

// ========================================
// Availability Management
// ========================================

export async function updateAvailability(
  userId: string,
  isAvailable?: boolean,
  availabilitySchedule?: any
): Promise<any> {
  return apiFetch(`/livreurs/${userId}/availability`, {
    method: 'PUT',
    body: JSON.stringify({ isAvailable, availabilitySchedule }),
  })
}

export async function sendHeartbeat(): Promise<void> {
  try {
    await apiFetch('/livreurs/heartbeat', { method: 'POST' })
  } catch (err) {
    // Silently fail heartbeat errors
    console.warn('[Heartbeat] Failed:', err)
  }
}

export { formatPrice }

// ========================================
// Helper: Get stored user
// ========================================

export interface StoredUser {
  id: string
  name: string
  phone: string
  role: string
  isAvailable: boolean
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('bm_user')
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredUser
  } catch {
    return null
  }
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('bm_token')
}

export function clearAuth(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('bm_token')
  localStorage.removeItem('bm_user')
}
