import axios from 'axios';

/**
 * API Base URL Resolver
 * - In development, use '/api' proxy through Vite.
 * - In production, use VITE_API_BASE_URL directly.
 */
const API_BASE_URL = import.meta.env.PROD
  ? import.meta.env.VITE_API_BASE_URL
  : '/api';

/**
 * Axios instance for B2B Management Dashboard API communications.
 */
const api = axios.create({
  baseURL: `${API_BASE_URL}/procurement`,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor — injects JWT Bearer token into Authorization header.
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('dashboard_token');
    if (token && token !== 'undefined' && token !== 'null' && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Concurrent token refresh queue
let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (err: unknown) => void }[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

/**
 * Response Interceptor — handles 401/403 with automatic token refresh + rotation.
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response &&
      (error.response.status === 401 ||
        (error.response.status === 403 && error.response.data?.error_code !== 'PHONE_NOT_VERIFIED'))
    ) {
      if (!originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = localStorage.getItem('dashboard_refreshToken');
        if (refreshToken && refreshToken !== 'undefined' && refreshToken !== 'null') {
          try {
            const res = await axios.post(`${API_BASE_URL}/procurement/auth/refresh-token`, { refreshToken });
            const newToken = res.data.accessToken;
            const newRefreshToken = res.data.refreshToken || refreshToken;

            localStorage.setItem('dashboard_token', newToken);
            localStorage.setItem('dashboard_refreshToken', newRefreshToken);
            window.dispatchEvent(
              new CustomEvent('dashboard:token-refreshed', {
                detail: { token: newToken, refreshToken: newRefreshToken },
              })
            );

            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            processQueue(null, newToken);
            return api(originalRequest);
          } catch (err) {
            processQueue(err, null);
            localStorage.removeItem('dashboard_token');
            localStorage.removeItem('dashboard_refreshToken');
            window.dispatchEvent(new Event('dashboard:unauthorized'));
            return Promise.reject(err);
          } finally {
            isRefreshing = false;
          }
        } else {
          localStorage.removeItem('dashboard_token');
          localStorage.removeItem('dashboard_refreshToken');
          window.dispatchEvent(new Event('dashboard:unauthorized'));
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
