import { createBrowserRouter, Navigate } from 'react-router-dom';

import DashboardLayout from '../layouts/DashboardLayout';
import RoleGuard from '../components/guards/RoleGuard';
import Login from '../pages/Login';
import Dashboard from '../pages/dashboard/Dashboard';
import ProductList from '../pages/products/ProductList';
import ProductForm from '../pages/products/ProductForm';
import OrderList from '../pages/orders/OrderList';
import OrderDetail from '../pages/orders/OrderDetail';
import BrandManager from '../pages/brands/BrandManager';
import CategoryManager from '../pages/categories/CategoryManager';
import DiscountPolicyManager from '../pages/discounts/DiscountPolicyManager';
import CarouselManager from '../pages/content/CarouselManager';
import HomepageConfigManager from '../pages/content/HomepageConfigManager';

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
        path: 'products/new',
        element: <ProductForm />,
      },
      {
        path: 'products/:productId',
        element: <ProductForm />,
      },
      {
        path: 'orders',
        element: <OrderList />,
      },
      {
        path: 'orders/:orderId',
        element: <OrderDetail />,
      },
      {
        path: 'brands',
        element: <BrandManager />,
      },
      {
        path: 'discount-policies',
        element: <DiscountPolicyManager />,
      },
      {
        path: 'carousels',
        element: <CarouselManager />,
      },
      {
        path: 'homepage-config',
        element: <HomepageConfigManager />,
      },
      {
        path: 'categories',
        element: (
          <RoleGuard allowedRoles={['admin']}>
            <CategoryManager />
          </RoleGuard>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);

export default router;
