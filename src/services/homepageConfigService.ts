import api from './api';
import type { HomepageConfig } from '../types';

export const homepageConfigService = {
  get: async (): Promise<any> => {
    const { data } = await api.get('/details/home');
    return data;
  },

  save: async (config: HomepageConfig): Promise<any> => {
    const { data } = await api.post('/details/home/create', config);
    return data;
  },
};
