import api from './api';
import type { AnalyticsSummary } from '../types';

/**
 * Analytics API — role-aware. The dashboard picks admin vs seller based on the
 * authenticated user's role; the backend further scopes the data server-side.
 */
export const analyticsService = {
  getAdminSummary: async (): Promise<AnalyticsSummary> => {
    const { data } = await api.get<AnalyticsSummary>('/admin/analytics/summary');
    return data;
  },

  getSellerSummary: async (): Promise<AnalyticsSummary> => {
    const { data } = await api.get<AnalyticsSummary>('/seller/analytics/summary');
    return data;
  },

  /** Convenience: fetch the summary appropriate for the given role. */
  getSummary: async (isAdmin: boolean): Promise<AnalyticsSummary> => {
    return isAdmin
      ? analyticsService.getAdminSummary()
      : analyticsService.getSellerSummary();
  },
};
