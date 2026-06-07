// ========================================
// Product & Category Types
// ========================================

export interface Product {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  price: number; // in centimes
  image: string | null;
  isAvailable: boolean;
  categoryId: string;
  category?: Category;
  createdAt?: string; // Optional: not always returned by API
}

export interface Category {
  id: string;
  name: string;
  nameAr: string | null;
  sortOrder: number;
  isActive: boolean;
  products?: Product[];
  createdAt?: string; // Optional: not always returned by API
}

export interface CategoryWithProducts extends Category {
  products: Product[];
}

// ========================================
// Delivery Zone Types
// ========================================

export interface DeliveryZone {
  id: string;
  name: string;
  dayFee: number; // in centimes
  nightFee: number; // in centimes
  startNight: string; // HH:MM
  endNight: string; // HH:MM
  isActive: boolean;
  createdAt?: string; // Optional: not always returned by API
}

export interface FeeCalculation {
  zoneId: string;
  zoneName: string;
  dayFee: number;
  nightFee: number;
  currentFee: number; // in centimes
  isNight: boolean;
  startNight: string;
  endNight: string;
}

// ========================================
// Temp Order Types (matching backend DTOs)
// ========================================

export interface TempOrderItemDto {
  productId: string;
  quantity: number;
  notes?: string;
}

export interface CreateTempOrderDto {
  clientPhone: string;
  clientName: string;
  clientAddress: string;
  deliveryZone: string;
  items: TempOrderItemDto[];
  notes?: string;
}

export interface UpdateTempOrderDto {
  clientName?: string;
  clientAddress?: string;
  deliveryZone?: string;
  items: TempOrderItemDto[];
  notes?: string;
}

export type TempOrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'CALLING'
  | 'VALIDATED'
  | 'REJECTED'
  | 'REPLACED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface OrderTempRedis {
  id: string;
  tempToken: string;
  clientPhone: string;
  clientName: string;
  clientAddress: string;
  deliveryZone: string;
  deliveryZoneId: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number; // in centimes
    notes?: string;
  }>;
  subtotal: number; // in centimes
  deliveryFee: number; // in centimes
  isNightDelivery: boolean;
  total: number; // in centimes
  status: TempOrderStatus;
  livreurId: string | null;
  acceptedByLivreurId: string | null;
  acceptedAt: string | null;
  version: number;
  previousId: string | null;
  createdAt: string;
  expiresAt: string;
  notes?: string;
}

export interface CreateTempOrderResponse {
  action: 'CREATED' | 'EXISTING_PENDING';
  tempToken?: string;
  orderTemp?: OrderTempRedis;
  existingOrder?: OrderTempRedis;
}

export interface UpdateTempOrderResponse {
  id: string;
  tempToken: string;
  clientPhone: string;
  clientName: string;
  clientAddress: string;
  deliveryZone: string;
  deliveryZoneId: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
    notes?: string;
  }>;
  subtotal: number;
  deliveryFee: number;
  isNightDelivery: boolean;
  total: number;
  status: TempOrderStatus;
  livreurId: string | null;
  version: number;
  previousId: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface CancelAndCreateResponse {
  action: 'CREATED';
  tempToken: string;
  orderTemp: OrderTempRedis;
}

export interface CheckPendingResponse {
  hasPending: boolean;
  order: OrderTempRedis | null;
}

// ========================================
// Order Types (PostgreSQL)
// ========================================

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'PARTIAL'
  | 'REFUNDED'
  | 'OFFERED';

export type OrderType = 'ONLINE' | 'POS';

export type OrderSource = 'ONLINE' | 'PHONE_CALL' | 'POS';

export type PaymentMethod = 'CASH';

export type PaymentIssue =
  | 'NONE'
  | 'CLIENT_SHORT_MONEY'
  | 'CLIENT_NO_CHANGE'
  | 'CLIENT_REFUSES_PAY'
  | 'WRONG_ADDRESS'
  | 'CLIENT_NOT_HOME'
  | 'OTHER';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  product: Product;
  quantity: number;
  price: number; // in centimes
  notes: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  type: OrderType;
  source: OrderSource;
  clientId: string;
  clientPhone: string;
  clientToken: string | null;
  assignedLivreurId: string | null;
  assignedLivreur: {
    id: string;
    name: string;
    phone: string | null;
    isAvailable: boolean;
  } | null;
  assignedAt: string | null;
  clientAddress: string;
  deliveryZone: string;
  deliveryFee: number; // in centimes
  isNightDelivery: boolean;
  subtotal: number; // in centimes
  total: number; // in centimes
  amountPaid: number | null; // in centimes
  changeDue: number | null; // in centimes
  paymentIssue: PaymentIssue;
  paymentIssueNote: string | null;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string;
  confirmedAt: string | null;
  preparedAt: string | null;
  readyAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  notes: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  sourceTempId: string | null;
  sourceVersion: number | null;
}

// ========================================
// API Response Types
// ========================================

// Generic API response wrapper (reserved for future use)
// export interface ApiResponse<T> {
//   data: T;
//   message?: string;
// }

export interface OrderValidatedPayload {
  orderId: string;
  orderNumber: string;
  clientToken: string;
}

export interface OrderRejectedPayload {
  reason: string;
}

export interface OrderExpiredPayload {
  tempToken: string;
}

export interface OrderStatusUpdatePayload {
  orderId: string;
  status: OrderStatus;
  order: Order;
}

// ========================================
// Cart Types
// ========================================

export interface CartItem {
  product: Product;
  quantity: number;
  attachedToProductId?: string; // For supplements: which burger this is attached to
  notes?: string; // Per-item notes
}
