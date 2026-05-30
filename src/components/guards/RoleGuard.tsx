import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AccessDenied from '../../pages/AccessDenied';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

/**
 * Route guard component that checks JWT role claim.
 * - If not authenticated → redirect to /login
 * - If authenticated but role is 'buyer' → show Access Denied screen
 * - If authenticated but role not in allowedRoles → show Access Denied screen
 * - If allowed → render children
 */
export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Buyers get a dedicated access-denied screen
  if (role === 'buyer') {
    return <AccessDenied />;
  }

  // Check if the user's role is in the allowed list
  if (role && !allowedRoles.includes(role)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
