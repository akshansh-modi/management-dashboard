import api from './api';
import type { Page, AdminUser, Role } from '../types';

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

  /** Helper for the product form's seller dropdown (admin assigning ownership). */
  listSellers: async (): Promise<AdminUser[]> => {
    const { data } = await api.get<Page<AdminUser>>('/admin/users', {
      params: { role: 'seller', page: 0, size: 200 },
    });
    return data.content;
  },
};
