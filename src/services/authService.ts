import api from './api';

export interface AuthConfig {
  activeProvider: string;
  requiresOtp: boolean;
  signupEnabled: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

export interface AuthStepResponse {
  nextAction: string;
  message: string;
}

/**
 * Authentication API service for the management dashboard.
 */
export const authService = {
  /**
   * Fetch server auth config (OTP vs credentials).
   */
  getAuthConfig: async (): Promise<AuthConfig> => {
    const response = await api.get('/auth/config');
    return response.data;
  },

  /**
   * Initiate the login flow (sends OTP if in OTP mode).
   */
  initiate: async (params: { mobileNumber?: string; username?: string; password?: string }): Promise<AuthStepResponse> => {
    const response = await api.post('/auth/initiate', params);
    return response.data;
  },

  /**
   * Authenticate and receive JWT tokens.
   */
  authenticate: async (params: {
    username?: string;
    mobileNumber?: string;
    password?: string;
    otp?: string;
  }): Promise<AuthResponse> => {
    const response = await api.post('/auth/authenticate', params);
    return response.data;
  },

  /**
   * Revoke refresh token and log out.
   */
  logout: async (): Promise<void> => {
    const refreshToken = localStorage.getItem('dashboard_refreshToken');
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken });
      } catch {
        // Silently ignore logout errors
      }
    }
    localStorage.removeItem('dashboard_token');
    localStorage.removeItem('dashboard_refreshToken');
  },
};
