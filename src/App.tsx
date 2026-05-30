import { RouterProvider } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { AuthProvider } from './context/AuthContext';
import theme from './config/theme';
import router from './router';

/**
 * Root Application Component
 * Wraps the entire app with:
 * - Ant Design ConfigProvider (custom theme)
 * - AuthProvider (JWT context)
 * - RouterProvider (React Router v6)
 */
export default function App() {
  return (
    <ConfigProvider theme={theme}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ConfigProvider>
  );
}
