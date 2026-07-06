import { io, Socket } from 'socket.io-client';
import type {
  OrderValidatedPayload,
  OrderRejectedPayload,
  OrderExpiredPayload,
  OrderStatusUpdatePayload,
  OrderTempRedis,
} from '@/bm/types';

const SOCKET_PORT = 3003;

let socket: Socket | null = null;

// ========================================
// Connection Management
// ========================================

export function getSocket(): Socket {
  if (!socket) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('bm_livreur_token') || localStorage.getItem('bm_admin_token') : null;
    
    // URL du socket-service
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3003';
    
    socket = io(socketUrl, {
      auth: { token },
      path: '/socket.io/',
      // Commencer par polling pour établir la connexion, puis upgrade vers WebSocket
      // Certains proxies (Coolify/Traefik) ne supportent pas l'upgrade WS direct
      transports: ['polling', 'websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket?.id)
    })

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason)
    })
  }
  return socket;
}

export function connect(): Socket {
  return getSocket();
}

export function disconnect(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

// ========================================
// Room Management
// ========================================

export function joinLivreurRoom(userId: string): void {
  const s = getSocket();
  s.emit('join:livreur', { userId });
}

export function joinAdminRoom(): void {
  const s = getSocket();
  s.emit('join:admin');
}

export function joinCuisineRoom(): void {
  const s = getSocket();
  s.emit('join:cuisine');
}

export function joinClientRoom(token: string): void {
  const s = getSocket();
  s.emit('join:client', { token });
}

export function leaveClientRoom(token: string): void {
  const s = getSocket();
  s.emit('leave:client', { token });
}

// ========================================
// Event Listeners
// ========================================

// --- Temp order events (client-side) ---

export function onOrderValidated(callback: (data: OrderValidatedPayload) => void): void {
  const s = getSocket();
  s.on('order:validated', callback);
}

export function onOrderRejected(callback: (data: OrderRejectedPayload) => void): void {
  const s = getSocket();
  s.on('order:rejected', callback);
}

export function onOrderExpired(callback: (data: OrderExpiredPayload) => void): void {
  const s = getSocket();
  s.on('order:expired', callback);
}

// --- Persistent order events ---

export function onOrderStatusUpdate(callback: (data: OrderStatusUpdatePayload) => void): void {
  const s = getSocket();
  s.on('order:status', callback);
}

export function onOrderReady(callback: (data: { orderId: string; orderNumber: string }) => void): void {
  const s = getSocket();
  s.on('order:ready', callback);
}

// --- Delivery events ---

export function onDeliveryStarted(callback: (data: { orderId: string; livreurName: string }) => void): void {
  const s = getSocket();
  s.on('delivery:started', callback);
}

export function onDeliveryIssue(callback: (data: { orderId: string; issue: string }) => void): void {
  const s = getSocket();
  s.on('delivery:issue', callback);
}

// --- New/Updated temp order events (livreur-side) ---

export function onOrderNew(callback: (data: OrderTempRedis) => void): void {
  const s = getSocket();
  s.on('order:new', callback);
}

export function onOrderAccepted(callback: (data: { tempToken: string; acceptedByLivreurId: string; acceptedByName: string }) => void): void {
  const s = getSocket();
  s.on('order:accepted', callback);
}

export function onOrderAcceptedByLivreur(callback: (data: { livreurName: string; message: string }) => void): void {
  const s = getSocket();
  s.on('order:accepted_by_livreur', callback);
}

export function onOrderUpdated(callback: (data: OrderTempRedis) => void): void {
  const s = getSocket();
  s.on('order:updated', callback);
}

// --- Order confirmed event (cuisine-side) ---

interface OrderConfirmedPayload {
  orderId: string;
  orderNumber: string;
  status: string;
}

export function onOrderConfirmed(callback: (data: OrderConfirmedPayload) => void): void {
  const s = getSocket();
  s.on('order:confirmed', callback);
}

// ========================================
// Cleanup
// ========================================

export function removeAllListeners(): void {
  if (socket) {
    socket.off('order:validated');
    socket.off('order:rejected');
    socket.off('order:expired');
    socket.off('order:status');
    socket.off('order:ready');
    socket.off('delivery:started');
    socket.off('delivery:issue');
    socket.off('order:new');
    socket.off('order:accepted');
    socket.off('order:accepted_by_livreur');
    socket.off('order:updated');
    socket.off('order:confirmed');
  }
}

// ========================================
// Server-side Emit Helper
// ========================================
// Call this from Next.js API routes to emit events via the socket service
// Uses the internal POST /emit endpoint on port 3004 (separate from Socket.IO port 3003)

const EMIT_URL = process.env.EMIT_SERVICE_URL || 'http://localhost:3004';

export async function emitToRoom(event: string, room: string, data: Record<string, unknown>): Promise<boolean> {
  try {
    const EMIT_SECRET = process.env.EMIT_SECRET
    if (!EMIT_SECRET || EMIT_SECRET.length < 32) {
      console.error('[Socket] FATAL: EMIT_SECRET must be set and >= 32 characters')
      return false
    }

    const res = await fetch(`${EMIT_URL}/emit`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-emit-secret': EMIT_SECRET as string
      },
      body: JSON.stringify({ event, room, data }),
    });
    return res.ok;
  } catch (err) {
    console.error('[Socket] emitToRoom error:', err);
    return false;
  }
}
