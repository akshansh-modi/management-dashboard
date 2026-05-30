import { createBrowserRouter, Navigate } from 'react-router-dom';

import DashboardLayout from '../layouts/DashboardLayout';
import RoleGuard from '../components/guards/RoleGuard';
import Login from '../pages/Login';
import Dashboard from '../pages/dashboard/Dashboard';
import ProductList from '../pages/products/ProductList';
import OrderList from '../pages/orders/OrderList';

/**
 * Application router with role-based route guards.
 */
const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <RoleGuard allowedRoles={['admin', 'seller']}>
        <DashboardLayout />
      </RoleGuard>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'products',
        element: <ProductList />,
      },
      {
        path: 'orders',
        element: <OrderList />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);

export default router;
