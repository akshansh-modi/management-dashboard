import api from './api';
import type { FilterAttribute, FilterConfig } from '../types';

export const filterService = {
  /**
   * Public endpoint — resolves direct + inherited filters for a category.
   * Used by ProductForm to get the schema when a category is selected.
   */
  getForCategory: async (categoryId: string): Promise<FilterConfig[]> => {
    const { data } = await api.get<{ categoryId: string; filters: FilterConfig[] }>(
      `/filters?categoryId=${encodeURIComponent(categoryId)}`
    );
    return data.filters ?? [];
  },

  /**
   * Admin endpoint — returns the full unresolved list of all filter configs.
   * Used by CategoryManager to build the direct/inherited partition.
   */
  getAll: async (): Promise<FilterAttribute[]> => {
    const { data } = await api.get<FilterAttribute[]>('/admin/filters/all');
    return data;
  },

  create: async (
    filter: Omit<FilterAttribute, 'mongoId'>
  ): Promise<FilterAttribute> => {
    const { data } = await api.post<FilterAttribute>('/admin/filters', filter);
    return data;
  },

  update: async (
    id: string,
    filter: Omit<FilterAttribute, 'mongoId' | 'attributeId'>
  ): Promise<FilterAttribute> => {
    const { data } = await api.put<FilterAttribute>(`/admin/filters/${id}`, filter);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/admin/filters/${id}`);
  },
};
