import api from './api';
import type { Brand } from '../types';

export const brandService = {
  getAll: async (): Promise<Brand[]> => {
    const { data } = await api.get<Brand[]>('/brands/all');
    return data;
  },

  create: async (brand: Brand): Promise<Brand> => {
    const { data } = await api.post<Brand>('/brands/create', brand);
    return data;
  },

  update: async (brand: Brand): Promise<Brand> => {
    const { data } = await api.put<Brand>('/brands/update', brand);
    return data;
  },
};
