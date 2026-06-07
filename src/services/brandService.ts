import api from './api';
import type { Brand, BulkCreateResult } from '../types';

export const brandService = {
  getAll: async (): Promise<Brand[]> => {
    // Admin dashboard needs disabled brands too (to show status / re-enable them).
    const { data } = await api.get<Brand[]>('/brands/all', { params: { includeInactive: true } });
    return data;
  },

  create: async (brand: Brand): Promise<Brand> => {
    const { data } = await api.post<Brand>('/brands/create', brand);
    return data;
  },

  bulkCreate: async (brands: Partial<Brand>[]): Promise<BulkCreateResult<Brand>> => {
    const { data } = await api.post<BulkCreateResult<Brand>>('/brands/bulkCreate', brands);
    return data;
  },

  update: async (brand: Brand): Promise<Brand> => {
    const { data } = await api.put<Brand>('/brands/update', brand);
    return data;
  },

  enable: async (brandId: string): Promise<void> => {
    await api.put('/brands/enable', null, { params: { brandId } });
  },

  disable: async (brandId: string): Promise<void> => {
    await api.put('/brands/disable', null, { params: { brandId } });
  },
};
