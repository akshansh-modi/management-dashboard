import api from './api';
import type { DiscountPolicy } from '../types';

export const discountPolicyService = {
  getAll: async (): Promise<DiscountPolicy[]> => {
    const { data } = await api.get<DiscountPolicy[]>('/discount-policies');
    return data;
  },

  getById: async (policyId: string): Promise<DiscountPolicy> => {
    const { data } = await api.get<DiscountPolicy>(`/discount-policies/${policyId}`);
    return data;
  },

  create: async (policy: Partial<DiscountPolicy>): Promise<DiscountPolicy> => {
    const { data } = await api.post<DiscountPolicy>('/discount-policies', policy);
    return data;
  },

  update: async (policyId: string, policy: Partial<DiscountPolicy>): Promise<DiscountPolicy> => {
    const { data } = await api.put<DiscountPolicy>(`/discount-policies/${policyId}`, policy);
    return data;
  },

  delete: async (policyId: string): Promise<void> => {
    await api.delete(`/discount-policies/${policyId}`);
  },
};
