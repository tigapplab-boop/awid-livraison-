import axios from 'axios';
import type {
  CategoryWithProducts,
  DeliveryZone,
  FeeCalculation,
  CheckPendingResponse,
  CreateTempOrderDto,
  CreateTempOrderResponse,
  UpdateTempOrderDto,
  UpdateTempOrderResponse,
  CancelAndCreateResponse,
  Order,
  OrderTempRedis,
} from '@/bm/types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// ========================================
// Products & Categories
// ========================================

export async function getProducts(): Promise<CategoryWithProducts[]> {
  const response = await api.get<CategoryWithProducts[]>('/products');
  return response.data;
}

export async function getCategories(): Promise<CategoryWithProducts[]> {
  const response = await api.get<CategoryWithProducts[]>('/categories');
  return response.data;
}

// ========================================
// Delivery Zones
// ========================================

export async function getZones(): Promise<DeliveryZone[]> {
  const response = await api.get<DeliveryZone[]>('/zones');
  return response.data;
}

export async function calculateFee(zoneId: string): Promise<FeeCalculation> {
  const response = await api.get<FeeCalculation>('/zones/calculate-fee', {
    params: { zoneId },
  });
  return response.data;
}

// ========================================
// Temp Orders
// ========================================

export async function checkPendingOrder(phone: string): Promise<CheckPendingResponse> {
  const response = await api.get<CheckPendingResponse>('/orders-temp/check', {
    params: { phone },
  });
  return response.data;
}

export async function createTempOrder(dto: CreateTempOrderDto): Promise<CreateTempOrderResponse> {
  const response = await api.post<CreateTempOrderResponse>('/orders-temp', dto);
  return response.data;
}

export async function getTempOrder(token: string): Promise<OrderTempRedis> {
  const response = await api.get<OrderTempRedis>(`/orders-temp/${token}`);
  return response.data;
}

export async function updateTempOrder(
  token: string,
  dto: UpdateTempOrderDto,
): Promise<UpdateTempOrderResponse> {
  const response = await api.post<UpdateTempOrderResponse>(
    `/orders-temp/${token}/update`,
    dto,
  );
  return response.data;
}

export async function cancelAndCreate(
  token: string,
  dto: CreateTempOrderDto,
): Promise<CancelAndCreateResponse> {
  const response = await api.post<CancelAndCreateResponse>(
    `/orders-temp/${token}/cancel-create`,
    dto,
  );
  return response.data;
}

// ========================================
// Orders
// ========================================

export async function getOrder(orderId: string): Promise<Order> {
  const response = await api.get<Order>(`/orders/${orderId}`);
  return response.data;
}

export async function getOrderByNumber(orderNumber: string): Promise<Order> {
  const response = await api.get<Order>(`/orders/number/${orderNumber}`);
  return response.data;
}

export async function getClientOrders(phone: string): Promise<Order[]> {
  const response = await api.get<Order[]>(`/orders/client/${phone}`);
  return response.data;
}

export default api;
