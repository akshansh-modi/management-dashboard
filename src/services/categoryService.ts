import api from './api';
import type { Category } from '../types';

export const categoryService = {
  getTree: async (): Promise<Category[]> => {
    const { data } = await api.get<Category[]>('/categories/tree');
    return data;
  },

  create: async (category: Category): Promise<Category> => {
    const { data } = await api.post<Category>('/categories/create', category);
    return data;
  },

  update: async (category: Category): Promise<Category> => {
    const { data } = await api.put<Category>('/categories/update', category);
    return data;
  },
};
