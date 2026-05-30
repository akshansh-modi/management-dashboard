import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authService } from '../services/authService';

/**
 * Decode JWT claims on the client side.
 */
function parseJwt(token: string): { role?: string; userId?: string; sub?: string } | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Normalize role string — strips 'ROLE_' prefix and lowercases.
 */
function normalizeRole(role: string | undefined): string | null {
  if (!role) return null;
  const cleaned = role.replace(/^ROLE_/i, '').toLowerCase();
  return cleaned; // 'admin' | 'seller' | 'buyer'
}

export interface AuthContextType {
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  role: string | null; // 'admin' | 'seller' | 'buyer' | null
  userId: string | null;
  username: string | null;
  isAdmin: boolean;
  isSeller: boolean;
  login: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('dashboard_token'));
  const [refreshToken, setRefreshToken] = useState<string | null>(
    localStorage.getItem('dashboard_refreshToken')
  );
  const [loading, setLoading] = useState(true);

  // Derive claims from token
  const claims = token ? parseJwt(token) : null;
  const role = normalizeRole(claims?.role);
  const userId = claims?.userId ?? null;
  const username = claims?.sub ?? null;
  const isAuthenticated = !!token;
  const isAdmin = role === 'admin';
  const isSeller = role === 'seller';

  const login = useCallback((accessToken: string, newRefreshToken: string) => {
    localStorage.setItem('dashboard_token', accessToken);
    localStorage.setItem('dashboard_refreshToken', newRefreshToken);
    setToken(accessToken);
    setRefreshToken(newRefreshToken);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setToken(null);
    setRefreshToken(null);
  }, []);

  useEffect(() => {
    // Handle unauthorized events from API interceptor
    const handleUnauthorized = () => {
      setToken(null);
      setRefreshToken(null);
    };
    window.addEventListener('dashboard:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('dashboard:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    // Sync with token refresh events from API interceptor
    const handleTokenRefreshed = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setToken(customEvent.detail.token);
        setRefreshToken(customEvent.detail.refreshToken);
      }
    };
    window.addEventListener('dashboard:token-refreshed', handleTokenRefreshed);
    return () => window.removeEventListener('dashboard:token-refreshed', handleTokenRefreshed);
  }, []);

  useEffect(() => {
    // Initial loading check
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        refreshToken,
        isAuthenticated,
        role,
        userId,
        username,
        isAdmin,
        isSeller,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
