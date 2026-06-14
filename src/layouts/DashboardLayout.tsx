import { useState, useEffect, useCallback } from 'react';
import { Layout, Menu, Avatar, Dropdown, Tag, Typography, Button, Badge, Drawer, List, Spin, Empty, Divider } from 'antd';
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
  BellOutlined,
  SearchOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/userService';
import { orderService } from '../services/orderService';
import GlobalSearch from '../components/GlobalSearch';
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

  // F27: Notifications bell state
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<{ orderId: string; buyerCompanyName?: string }[]>([]);
  const [pendingUsers, setPendingUsers] = useState<{ userId: string; companyName?: string; username?: string }[]>([]);
  const [notifBadge, setNotifBadge] = useState(0);

  // F04: Global search state
  const [searchOpen, setSearchOpen] = useState(false);

  const { username, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Detect mobile breakpoint
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (mobile) {
        setCollapsed(false);
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

  // F04: global ⌘K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // F27: fetch pending notifications (lazy — only when drawer opens)
  const fetchNotifications = useCallback(async () => {
    if (!isAdmin) return;
    setNotifLoading(true);
    try {
      const [ordersRes, usersRes] = await Promise.all([
        orderService.listAll({ status: 'PENDING', page: 0, size: 5 }),
        userService.list({ status: 'PENDING_APPROVAL', page: 0, size: 5 }),
      ]);
      setPendingOrders(
        ordersRes.content.map((o) => ({ orderId: o.orderId, buyerCompanyName: o.buyerCompanyName }))
      );
      setPendingUsers(
        usersRes.content.map((u) => ({ userId: u.userId, companyName: u.companyName, username: u.username }))
      );
    } catch {
      /* non-blocking */
    } finally {
      setNotifLoading(false);
    }
  }, [isAdmin]);

  // F27: poll badge count every 2 minutes (lightweight — just the count)
  const fetchBadgeCount = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const [ordersRes, usersRes] = await Promise.all([
        orderService.listAll({ status: 'PENDING', page: 0, size: 1 }),
        userService.list({ status: 'PENDING_APPROVAL', page: 0, size: 1 }),
      ]);
      setNotifBadge((ordersRes.totalElements ?? 0) + (usersRes.totalElements ?? 0));
    } catch {
      /* non-blocking */
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchBadgeCount();
    const interval = setInterval(fetchBadgeCount, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchBadgeCount]);

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
    } else {
      setCollapsed((prev) => !prev);
    }
  };

  const handleBellClick = () => {
    setNotifOpen(true);
    fetchNotifications();
  };

  // Build menu items based on role, grouped into labelled sections (F05)
  const menuItems: MenuProps['items'] = [
    {
      type: 'group',
      label: 'Overview',
      children: [
        { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
      ],
    },
    {
      type: 'group',
      label: 'Catalog',
      children: [
        { key: '/products', icon: <ShoppingOutlined />, label: 'Products' },
        { key: '/bulk-upload', icon: <CloudUploadOutlined />, label: 'Bulk Upload' },
        ...(isAdmin
          ? [
              { key: '/categories', icon: <AppstoreOutlined />, label: 'Categories' },
              { key: '/brands', icon: <TagsOutlined />, label: 'Brands' },
              { key: '/discount-policies', icon: <PercentageOutlined />, label: 'Discount Policies' },
            ]
          : [
              { key: '/brands', icon: <TagsOutlined />, label: 'Brands' },
              { key: '/discount-policies', icon: <PercentageOutlined />, label: 'Discount Policies' },
            ]),
      ],
    },
    {
      type: 'group',
      label: 'Sales',
      children: [
        { key: '/orders', icon: <ShoppingCartOutlined />, label: 'Orders' },
        ...(isAdmin
          ? [{ key: '/payments', icon: <DollarOutlined />, label: 'Payments' }]
          : []),
      ],
    },
    ...(isAdmin
      ? [
          {
            type: 'group' as const,
            label: 'Customers',
            children: [
              { key: '/users', icon: <TeamOutlined />, label: 'Users' },
            ],
          },
          {
            type: 'group' as const,
            label: 'Content',
            children: [
              { key: '/carousels', icon: <PictureOutlined />, label: 'Carousels' },
              { key: '/homepage-config', icon: <HomeOutlined />, label: 'Homepage Config' },
            ],
          },
        ]
      : [
          {
            type: 'group' as const,
            label: 'Settings',
            children: [
              { key: '/settings', icon: <SettingOutlined />, label: 'Business Settings' },
            ],
          },
        ]),
  ];

  const roleColor = isAdmin ? 'blue' : 'green';
  const roleLabel = isAdmin ? 'Admin' : 'Seller';

  // F07: removed dead "Profile" item
  const userDropdownItems: MenuProps['items'] = [
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

  // F06: correct selected key derivation
  const segment = location.pathname.split('/').filter(Boolean)[0];
  const selectedKey = segment ? `/${segment}` : '/dashboard';

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
            {/* F04: Global search button */}
            <Button
              type="text"
              icon={<SearchOutlined />}
              onClick={() => setSearchOpen(true)}
              title="Search (⌘K)"
              style={{ color: '#6B7280', borderRadius: 8, border: '1px solid #E5E7EB', padding: '0 10px', height: 34, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Text style={{ fontSize: 12, color: '#9CA3AF' }} className="search-hint-text">⌘K</Text>
            </Button>

            {/* F27: Notifications bell (admin only) */}
            {isAdmin && (
              <Badge count={notifBadge} size="small" offset={[-2, 2]}>
                <Button
                  type="text"
                  icon={<BellOutlined style={{ fontSize: 18 }} />}
                  onClick={handleBellClick}
                  style={{ color: '#6B7280', width: 36, height: 36 }}
                />
              </Badge>
            )}

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

      {/* F04: Global search modal */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* F27: Notifications drawer */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BellOutlined />
            <span>Needs Your Attention</span>
            {notifBadge > 0 && (
              <Badge count={notifBadge} style={{ backgroundColor: '#FAAD14' }} />
            )}
          </div>
        }
        placement="right"
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        width={380}
        extra={
          <Button type="text" size="small" onClick={() => setNotifOpen(false)}>
            Close
          </Button>
        }
      >
        {notifLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin />
            <div style={{ marginTop: 12, color: '#9CA3AF' }}>Loading…</div>
          </div>
        ) : (
          <>
            {/* Pending orders section */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <ClockCircleOutlined style={{ color: '#FAAD14' }} />
                <Text strong>Pending Payment Orders</Text>
                {pendingOrders.length > 0 && (
                  <Tag color="gold">{pendingOrders.length}</Tag>
                )}
              </div>
              {pendingOrders.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No pending orders"
                  style={{ padding: '12px 0' }}
                />
              ) : (
                <List
                  dataSource={pendingOrders}
                  renderItem={(o) => (
                    <List.Item
                      key={o.orderId}
                      style={{ cursor: 'pointer', padding: '10px 12px', borderRadius: 8, transition: 'background 0.15s' }}
                      className="notif-list-item"
                      onClick={() => { navigate(`/orders/${o.orderId}`); setNotifOpen(false); }}
                      extra={
                        <Tag color="gold" style={{ marginLeft: 4 }}>PENDING</Tag>
                      }
                    >
                      <List.Item.Meta
                        title={
                          <Text strong style={{ fontFamily: 'monospace', fontSize: 12 }}>
                            {o.orderId}
                          </Text>
                        }
                        description={
                          o.buyerCompanyName
                            ? <Text type="secondary" style={{ fontSize: 12 }}>{o.buyerCompanyName}</Text>
                            : null
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
              {pendingOrders.length >= 5 && (
                <Button
                  type="link"
                  size="small"
                  style={{ paddingLeft: 0 }}
                  onClick={() => { navigate('/orders?status=PENDING'); setNotifOpen(false); }}
                >
                  View all pending orders →
                </Button>
              )}
            </div>

            <Divider style={{ margin: '12px 0' }} />

            {/* Pending user approvals */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <CheckCircleOutlined style={{ color: '#2F54EB' }} />
                <Text strong>Buyer Accounts to Review</Text>
                {pendingUsers.length > 0 && (
                  <Tag color="blue">{pendingUsers.length}</Tag>
                )}
              </div>
              {pendingUsers.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No pending approvals"
                  style={{ padding: '12px 0' }}
                />
              ) : (
                <List
                  dataSource={pendingUsers}
                  renderItem={(u) => (
                    <List.Item
                      key={u.userId}
                      style={{ cursor: 'pointer', padding: '10px 12px', borderRadius: 8, transition: 'background 0.15s' }}
                      className="notif-list-item"
                      onClick={() => { navigate(`/users/${u.userId}`); setNotifOpen(false); }}
                      extra={
                        <Tag color="orange" style={{ marginLeft: 4 }}>Pending</Tag>
                      }
                    >
                      <List.Item.Meta
                        title={
                          <Text strong style={{ fontSize: 13 }}>
                            {u.companyName || u.username || u.userId}
                          </Text>
                        }
                        description={
                          u.companyName && u.username
                            ? <Text type="secondary" style={{ fontSize: 12 }}>@{u.username}</Text>
                            : null
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
              {pendingUsers.length >= 5 && (
                <Button
                  type="link"
                  size="small"
                  style={{ paddingLeft: 0 }}
                  onClick={() => { navigate('/users'); setNotifOpen(false); }}
                >
                  View all in Users →
                </Button>
              )}
            </div>

            {pendingOrders.length === 0 && pendingUsers.length === 0 && !notifLoading && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <CloseCircleOutlined style={{ fontSize: 32, color: '#D1D5DB' }} />
                <div style={{ marginTop: 12, color: '#9CA3AF' }}>
                  Everything is under control — nothing needs attention right now.
                </div>
              </div>
            )}
          </>
        )}
      </Drawer>
    </Layout>
  );
}
