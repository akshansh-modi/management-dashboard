import api from './api';
import type { Page, Order, OrderStatus, OrderPayments } from '../types';

/**
 * Order API. Admins see every order via /admin/orders; sellers see only orders
 * containing their line items via /seller/orders.
 */
export const orderService = {
  /** Admin: all orders, optionally filtered by status. */
  listAll: async (params: { status?: string; q?: string; page?: number; size?: number } = {}): Promise<Page<Order>> => {
    const { status, q, page = 0, size = 10 } = params;
    const { data } = await api.get<Page<Order>>('/admin/orders', {
      params: { ...(status ? { status } : {}), ...(q ? { q } : {}), page, size },
    });
    return data;
  },

  /** Seller: orders containing this seller's products (optional server-side status filter). */
  listForSeller: async (params: { status?: string; page?: number; size?: number } = {}): Promise<Page<Order>> => {
    const { status, page = 0, size = 10 } = params;
    const { data } = await api.get<Page<Order>>('/seller/orders', {
      params: { ...(status ? { status } : {}), page, size },
    });
    return data;
  },

  getById: async (orderId: string): Promise<Order> => {
    const { data } = await api.get<Order>(`/orders/${orderId}`);
    return data;
  },

  getPayments: async (orderId: string): Promise<OrderPayments> => {
    const { data } = await api.get<OrderPayments>(`/orders/${orderId}/payments`);
    return data;
  },

  /** Admin status transition (records statusHistory + payment side-effects). */
  adminUpdateStatus: async (orderId: string, status: OrderStatus, notes?: string): Promise<Order> => {
    const { data } = await api.post<Order>(`/orders/${orderId}/status`, { status, notes });
    return data;
  },

  /** Seller status transition. */
  updateStatus: async (orderId: string, status: OrderStatus, notes?: string): Promise<Order> => {
    const { data } = await api.patch<Order>(`/orders/${orderId}/status`, { status, notes });
    return data;
  },
};
