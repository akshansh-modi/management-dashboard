import api from './api';
import type { Carousel } from '../types';

export const carouselService = {
  getAll: async (): Promise<Carousel[]> => {
    const { data } = await api.get<Carousel[]>('/carousels/all');
    return data;
  },

  create: async (carousel: Partial<Carousel>): Promise<Carousel> => {
    const { data } = await api.post<Carousel>('/carousels/create', carousel);
    return data;
  },

  update: async (carouselId: string, carousel: Partial<Carousel>): Promise<Carousel> => {
    const { data } = await api.put<Carousel>(`/carousels/${carouselId}`, carousel);
    return data;
  },

  delete: async (carouselId: string): Promise<void> => {
    await api.delete(`/carousels/${carouselId}`);
  },
};
