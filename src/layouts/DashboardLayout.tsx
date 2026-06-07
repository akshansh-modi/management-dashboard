import { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Tag, Typography, Button } from 'antd';
import {
  DashboardOutlined,
  ShoppingOutlined,
  ShoppingCartOutlined,
  AppstoreOutlined,
  TagsOutlined,
  PercentageOutlined,
  TeamOutlined,
  PictureOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DollarOutlined,
  UserOutlined,
  HomeOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { MenuProps } from 'antd';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const MOBILE_BREAKPOINT = 768;

/**
 * Main dashboard layout with responsive sidebar.
 * On screens ≤ 768px the sidebar becomes a drawer overlay that slides in/out.
 */
export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { username, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Detect mobile breakpoint
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (mobile) {
        setCollapsed(false); // Reset collapse state — on mobile we use mobileOpen instead
        setMobileOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close drawer on route change (mobile)
  useEffect(() => {
    if (isMobile) setMobileOpen(false);
  }, [location.pathname, isMobile]);

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
    } else {
      setCollapsed((prev) => !prev);
    }
  };

  // Build menu items based on role
  const menuItems: MenuProps['items'] = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/products',
      icon: <ShoppingOutlined />,
      label: 'Products',
    },
    {
      key: '/orders',
      icon: <ShoppingCartOutlined />,
      label: 'Orders',
    },
    {
      key: '/bulk-upload',
      icon: <CloudUploadOutlined />,
      label: 'Bulk Upload',
    },
    // Admin-only items
    ...(isAdmin
      ? [
          {
            key: '/categories',
            icon: <AppstoreOutlined />,
            label: 'Categories',
          },
          {
            key: '/brands',
            icon: <TagsOutlined />,
            label: 'Brands',
          },
          {
            key: '/discount-policies',
            icon: <PercentageOutlined />,
            label: 'Discount Policies',
          },
          {
            key: '/users',
            icon: <TeamOutlined />,
            label: 'Users',
          },
          {
            key: '/carousels',
            icon: <PictureOutlined />,
            label: 'Carousels',
          },
          {
            key: '/payments',
            icon: <DollarOutlined />,
            label: 'Payments',
          },
          {
            key: '/homepage-config',
            icon: <HomeOutlined />,
            label: 'Homepage Config',
          },
        ]
      : [
          // Seller sees brands and discounts
          {
            key: '/brands',
            icon: <TagsOutlined />,
            label: 'Brands',
          },
          {
            key: '/discount-policies',
            icon: <PercentageOutlined />,
            label: 'Discount Policies',
          },
          {
            key: '/settings',
            icon: <SettingOutlined />,
            label: 'Business Settings',
          },
        ]),
  ];

  const roleColor = isAdmin ? 'blue' : 'green';
  const roleLabel = isAdmin ? 'Admin' : 'Seller';

  const userDropdownItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
      onClick: logout,
    },
  ];

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key);
  };

  // Find the current selected key based on path
  const selectedKey = '/' + location.pathname.split('/').filter(Boolean)[0] || '/dashboard';

  // Sidebar width calculations
  const siderWidth = 260;
  const siderCollapsedWidth = 80;
  const currentSiderWidth = isMobile ? 0 : collapsed ? siderCollapsedWidth : siderWidth;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Mobile overlay backdrop */}
      {isMobile && (
        <div
          className={`sidebar-overlay${mobileOpen ? ' visible' : ''}`}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sider
        className={`dashboard-sider${isMobile && mobileOpen ? ' mobile-open' : ''}`}
        collapsible={!isMobile}
        collapsed={isMobile ? false : collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={siderWidth}
        collapsedWidth={siderCollapsedWidth}
        theme="dark"
      >
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">SD</div>
          {(isMobile || !collapsed) && <span className="logo-text">Sanitary Direct</span>}
        </div>

        {/* Navigation Menu */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0, padding: '0 8px' }}
        />
      </Sider>

      <Layout
        className="dashboard-main-layout"
        style={{ marginLeft: currentSiderWidth, transition: 'margin-left 0.2s' }}
      >
        {/* Header */}
        <Header className="dashboard-header">
          <div className="header-left">
            <Button
              type="text"
              icon={
                isMobile
                  ? mobileOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />
                  : collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />
              }
              onClick={toggleSidebar}
              style={{ fontSize: 18 }}
            />
          </div>

          <div className="header-right">
            <Tag color={roleColor} style={{ margin: 0, borderRadius: 6, fontWeight: 500 }}>
              {roleLabel}
            </Tag>
            <Dropdown menu={{ items: userDropdownItems }} trigger={['click']} placement="bottomRight">
              <div className="user-info">
                <Avatar
                  size={36}
                  style={{ background: isAdmin ? '#2F54EB' : '#52C41A', fontWeight: 600 }}
                  icon={<UserOutlined />}
                />
                {username && (
                  <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                    <Text className="user-name">{username}</Text>
                    <Text className="user-role">{roleLabel}</Text>
                  </div>
                )}
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* Content */}
        <Content className="dashboard-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
