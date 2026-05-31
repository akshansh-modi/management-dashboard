import api from './api';
import type { PendingPayment, BalancePayment } from '../types';

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

  /**
   * Admin-only: delivered orders whose 90% balance (Stage-90) is still PENDING
   * and awaiting finance verification.
   */
  getBalancePayments: async (): Promise<BalancePayment[]> => {
    const { data } = await api.get<BalancePayment[]>('/admin/payments/balance');
    return data;
  },

  /**
   * Finance verification of a Stage-90 balance — records the payment method + UTR.
   */
  verifyBalancePayment: async (orderId: string, utr: string, method: string) => {
    const { data } = await api.post(`/admin/payments/${orderId}/balance/verify`, { utr, method });
    return data;
  },
};
