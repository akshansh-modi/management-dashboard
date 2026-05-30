import { RouterProvider } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import { AuthProvider } from './context/AuthContext';
import theme from './config/theme';
import router from './router';

/**
 * Root Application Component
 * Wraps the entire app with:
 * - Ant Design ConfigProvider (custom theme)
 * - Ant Design App (context for message/notification/modal — themed, no static warnings)
 * - AuthProvider (JWT context)
 * - RouterProvider (React Router v6)
 */
export default function App() {
  return (
    <ConfigProvider theme={theme}>
      <AntApp>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  );
}
