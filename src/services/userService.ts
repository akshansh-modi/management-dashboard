import api from './api';
import type { Page, AdminUser, Role, BuyerAnalytics, Order } from '../types';

/**
 * Admin user-management API. Admin-only on the backend (/admin/**).
 */
export const userService = {
  list: async (params: { role?: Role; page?: number; size?: number } = {}): Promise<Page<AdminUser>> => {
    const { role, page = 0, size = 20 } = params;
    const { data } = await api.get<Page<AdminUser>>('/admin/users', {
      params: { ...(role ? { role } : {}), page, size },
    });
    return data;
  },

  getById: async (userId: string): Promise<AdminUser> => {
    const { data } = await api.get<AdminUser>(`/admin/users/${userId}`);
    return data;
  },

  changeRole: async (userId: string, role: Role): Promise<AdminUser> => {
    const { data } = await api.patch<AdminUser>(`/admin/users/${userId}/role`, { role });
    return data;
  },

  /** Per-buyer importance analytics (admin). */
  getBuyerAnalytics: async (userId: string): Promise<BuyerAnalytics> => {
    const { data } = await api.get<BuyerAnalytics>(`/admin/users/${userId}/analytics`);
    return data;
  },

  /** A specific user's orders (admin), newest first. */
  getBuyerOrders: async (userId: string, page = 0, size = 10): Promise<Page<Order>> => {
    const { data } = await api.get<Page<Order>>(`/admin/users/${userId}/orders`, {
      params: { page, size },
    });
    return data;
  },

  /** Helper for the product form's seller dropdown (admin assigning ownership). */
  listSellers: async (): Promise<AdminUser[]> => {
    const { data } = await api.get<Page<AdminUser>>('/admin/users', {
      params: { role: 'seller', page: 0, size: 200 },
    });
    return data.content;
  },

  /** Seller-specific operations */
  getSettings: async (): Promise<Partial<AdminUser>> => {
    const { data } = await api.get<Partial<AdminUser>>('/seller/settings');
    return data;
  },

  updateSettings: async (settings: Partial<AdminUser>): Promise<Partial<AdminUser>> => {
    const { data } = await api.put<Partial<AdminUser>>('/seller/settings', settings);
    return data;
  },
};
