import api from './api';
import type { PendingPayment } from '../types';

export const paymentService = {
  /**
   * Admin-only: fetch orders awaiting Stage-10 payment verification.
   * Uses the dedicated /admin/payments/pending endpoint which returns
   * PendingPaymentResponse DTOs with explicit payment details.
   */
  getPendingPayments: async (): Promise<PendingPayment[]> => {
    const { data } = await api.get<PendingPayment[]>('/admin/payments/pending');
    return data;
  },

  /**
   * Verify an order's payment, transitioning it from PENDING → CONFIRMED.
   * Uses POST /orders/{orderId}/status (the admin status transition endpoint).
   */
  verifyPayment: async (orderId: string, notes?: string) => {
    const { data } = await api.post(`/orders/${orderId}/status`, {
      status: 'CONFIRMED',
      notes,
    });
    return data;
  },
};
