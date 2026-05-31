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
   * Verify an order's Stage-10 payment, transitioning it PENDING → CONFIRMED.
   * The UTR (or transaction reference) is stored on the Payment record for audit.
   * Uses POST /orders/{orderId}/status (the admin status transition endpoint),
   * which internally calls verifyStage10 with the supplied reference.
   */
  verifyPayment: async (orderId: string, utr?: string) => {
    const { data } = await api.post(`/orders/${orderId}/status`, {
      status: 'CONFIRMED',
      notes: utr,
    });
    return data;
  },
};
