import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Typography, Row, Col, Statistic, Tag, Spin, Alert, Button, Space, Table,
  Descriptions, Divider, Empty,
} from 'antd';
import {
  ArrowLeftOutlined, DollarOutlined, ShoppingCartOutlined, DropboxOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { userService } from '../../services/userService';
import type { AdminUser, BuyerAnalytics, Order, OrderStatus } from '../../types';
import { STATUS_TAG } from '../orders/OrderList';

const { Title, Text } = Typography;

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement,
  Tooltip, Legend, Filler
);

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#FAAD14', CONFIRMED: '#2F54EB', PROCESSING: '#13C2C2',
  SHIPPED: '#722ED1', DELIVERED: '#52C41A', CANCELLED: '#FF4D4F',
};

const inr = (v?: number | null) => (v != null ? `₹${Math.round(v).toLocaleString('en-IN')}` : '—');

const lineOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#9CA3AF', font: { size: 12 } } },
    y: {
      grid: { color: '#F0F0F0' },
      ticks: { color: '#9CA3AF', font: { size: 12 },
        callback: (v: number | string) => '₹' + Number(v).toLocaleString('en-IN') },
    },
  },
};
const barOptions = {
  responsive: true, maintainAspectRatio: false, indexAxis: 'y' as const,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { color: '#F0F0F0' }, ticks: { color: '#9CA3AF', font: { size: 12 } } },
    y: { grid: { display: false }, ticks: { color: '#374151', font: { size: 12 } } },
  },
};
const doughnutOptions = {
  responsive: true, maintainAspectRatio: false, cutout: '65%',
  plugins: { legend: { position: 'bottom' as const, labels: { padding: 14, usePointStyle: true, font: { size: 12 }, color: '#6B7280' } } },
};

export default function BuyerDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<AdminUser | null>(null);
  const [analytics, setAnalytics] = useState<BuyerAnalytics | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersPage, setOrdersPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([userService.getById(userId), userService.getBuyerAnalytics(userId)])
      .then(([p, a]) => {
        if (cancelled) return;
        setProfile(p);
        setAnalytics(a);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.response?.data?.message || e?.message || 'Failed to load buyer');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [userId]);

  const fetchOrders = useCallback(async () => {
    if (!userId) return;
    setOrdersLoading(true);
    try {
      const res = await userService.getBuyerOrders(userId, ordersPage, 10);
      setOrders(res.content);
      setOrdersTotal(res.totalElements);
    } finally {
      setOrdersLoading(false);
    }
  }, [userId, ordersPage]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const k = analytics?.kpis;

  const spendData = useMemo(() => {
    const s = analytics?.monthlySpend ?? [];
    return {
      labels: s.map((p) => p.label),
      datasets: [{
        label: 'Spend (₹)', data: s.map((p) => p.value),
        borderColor: '#2F54EB', backgroundColor: 'rgba(47,84,235,0.08)',
        tension: 0.4, fill: true, pointBackgroundColor: '#2F54EB',
        pointBorderColor: '#FFF', pointBorderWidth: 2, pointRadius: 4,
      }],
    };
  }, [analytics]);

  const statusData = useMemo(() => {
    const s = (analytics?.ordersByStatus ?? []).filter((x) => x.count > 0);
    return {
      labels: s.map((x) => x.status.charAt(0) + x.status.slice(1).toLowerCase()),
      datasets: [{ data: s.map((x) => x.count), backgroundColor: s.map((x) => STATUS_COLORS[x.status] ?? '#8C8C8C'), borderWidth: 0 }],
    };
  }, [analytics]);

  const productsData = useMemo(() => {
    const s = analytics?.topProducts ?? [];
    return {
      labels: s.map((p) => p.productName ?? p.productId),
      datasets: [{ label: 'Units', data: s.map((p) => p.quantitySold), backgroundColor: 'rgba(47,84,235,0.7)', borderRadius: 6 }],
    };
  }, [analytics]);

  const orderColumns: ColumnsType<Order> = [
    { title: 'Order ID', dataIndex: 'orderId', key: 'orderId',
      render: (v) => <Text strong style={{ fontFamily: 'monospace' }}>{v}</Text> },
    { title: 'Date', dataIndex: 'orderDate', key: 'orderDate', responsive: ['md'],
      render: (v?: string) => (v ? dayjs(v).format('DD MMM YYYY') : '—') },
    { title: 'Items', key: 'items', align: 'center', responsive: ['lg'],
      render: (_, o) => o.items?.length ?? 0 },
    { title: 'Total', dataIndex: 'finalTotal', key: 'finalTotal', align: 'right',
      render: (v?: number) => <Text strong>{inr(v)}</Text> },
    { title: 'Status', dataIndex: 'status', key: 'status',
      render: (s: OrderStatus) => <Tag color={STATUS_TAG[s] ?? 'default'}>{s}</Tag> },
    { title: '', key: 'action', align: 'right',
      render: (_, o) => <Button type="link" onClick={() => navigate(`/orders/${o.orderId}`)}>View</Button> },
  ];

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /><div style={{ marginTop: 12, color: '#6B7280' }}>Loading buyer…</div></div>;
  }
  if (error) {
    return (
      <div className="animate-fade-in">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/users')}>Back to users</Button>
        <Alert type="error" showIcon message={error} style={{ marginTop: 16 }} />
      </div>
    );
  }

  const kpiCards = [
    { title: 'Total spend', value: inr(k?.totalSpend), icon: <DollarOutlined />, color: '#2F54EB', bg: '#EBF0FF' },
    { title: 'Orders', value: k ? k.totalOrders.toLocaleString('en-IN') : '—', icon: <ShoppingCartOutlined />, color: '#722ED1', bg: '#F5EDFF' },
    { title: 'Items ordered', value: k ? k.totalItems.toLocaleString('en-IN') : '—', icon: <DropboxOutlined />, color: '#52C41A', bg: '#EDFFF0' },
    { title: 'Avg order value', value: inr(k?.avgOrderValue), icon: <DollarOutlined />, color: '#13C2C2', bg: '#E6FFFB' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <Space style={{ marginBottom: 4 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/users')} />
          <Title level={3} style={{ margin: 0 }}>{profile?.companyName || profile?.username || userId}</Title>
          <Tag color={profile?.role === 'buyer' ? 'default' : 'blue'}>{profile?.role}</Tag>
        </Space>
        <Text type="secondary">Buyer profile & importance analytics</Text>
      </div>

      {/* Profile */}
      <div className="chart-card" style={{ marginBottom: 20 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small">
          <Descriptions.Item label="User ID">{profile?.userId}</Descriptions.Item>
          <Descriptions.Item label="Mobile">{profile?.mobileNumber || '—'}</Descriptions.Item>
          <Descriptions.Item label="Email">{profile?.emailId || '—'}</Descriptions.Item>
          <Descriptions.Item label="GSTIN">{profile?.gstin || '—'}</Descriptions.Item>
          <Descriptions.Item label="PAN">{profile?.pan || '—'}</Descriptions.Item>
          <Descriptions.Item label="Phone verified">{profile?.phoneVerified ? 'Yes' : 'No'}</Descriptions.Item>
          <Descriptions.Item label="Address" span={3}>
            {profile?.address
              ? [profile.address.addressLine, profile.address.city, profile.address.state, profile.address.pincode].filter(Boolean).join(', ') || '—'
              : '—'}
          </Descriptions.Item>
        </Descriptions>
      </div>

      {/* KPIs */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {kpiCards.map((c) => (
          <Col xs={12} lg={6} key={c.title}>
            <div className="kpi-card">
              <div className="kpi-icon" style={{ background: c.bg, color: c.color }}>{c.icon}</div>
              <Statistic title={<Text type="secondary" style={{ fontSize: 13 }}>{c.title}</Text>}
                value={c.value} valueStyle={{ fontWeight: 700, fontSize: 24, color: '#1A1A2E' }} />
            </div>
          </Col>
        ))}
      </Row>

      {/* Recency / health strip */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} lg={6}>
          <div className="kpi-card">
            <div className="kpi-icon" style={{ background: '#FFF8E6', color: '#FAAD14' }}><ClockCircleOutlined /></div>
            <Statistic title={<Text type="secondary" style={{ fontSize: 13 }}>Last order</Text>}
              value={k?.lastOrderDate ? dayjs(k.lastOrderDate).format('DD MMM YYYY') : '—'}
              valueStyle={{ fontWeight: 700, fontSize: 18 }} />
            {k?.daysSinceLastOrder != null && (
              <Text type="secondary" style={{ fontSize: 12 }}>{k.daysSinceLastOrder} days ago</Text>
            )}
          </div>
        </Col>
        <Col xs={12} lg={6}>
          <div className="kpi-card">
            <div className="kpi-icon" style={{ background: '#FFF1F0', color: '#FF4D4F' }}><ShoppingCartOutlined /></div>
            <Statistic title={<Text type="secondary" style={{ fontSize: 13 }}>Cancellation rate</Text>}
              value={k ? `${Math.round((k.cancellationRate ?? 0) * 100)}%` : '—'}
              valueStyle={{ fontWeight: 700, fontSize: 24 }} />
          </div>
        </Col>
        <Col xs={12} lg={6}>
          <div className="kpi-card">
            <div className="kpi-icon" style={{ background: '#FFF8E6', color: '#FAAD14' }}><DollarOutlined /></div>
            <Statistic title={<Text type="secondary" style={{ fontSize: 13 }}>Pending payments</Text>}
              value={k ? k.pendingPayments.toLocaleString('en-IN') : '—'}
              valueStyle={{ fontWeight: 700, fontSize: 24 }} />
          </div>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[20, 20]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={16}>
          <div className="chart-card">
            <div className="chart-header"><Title level={5} style={{ margin: 0 }}>Spend over time</Title><Tag color="blue">Last 6 months</Tag></div>
            <div style={{ height: 300 }}>
              {(analytics?.monthlySpend ?? []).some((p) => p.value > 0)
                ? <Line data={spendData} options={lineOptions as Parameters<typeof Line>[0]['options']} />
                : <Empty description="No confirmed spend" style={{ paddingTop: 80 }} />}
            </div>
          </div>
        </Col>
        <Col xs={24} lg={8}>
          <div className="chart-card">
            <div className="chart-header"><Title level={5} style={{ margin: 0 }}>Orders by status</Title></div>
            <div style={{ height: 300 }}>
              {(analytics?.ordersByStatus ?? []).some((x) => x.count > 0)
                ? <Doughnut data={statusData} options={doughnutOptions} />
                : <Empty description="No orders" style={{ paddingTop: 80 }} />}
            </div>
          </div>
        </Col>
      </Row>

      <Row gutter={[20, 20]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={12}>
          <div className="chart-card">
            <div className="chart-header"><Title level={5} style={{ margin: 0 }}>Top products</Title></div>
            <div style={{ height: 280 }}>
              {(analytics?.topProducts ?? []).length
                ? <Bar data={productsData} options={barOptions} />
                : <Empty description="No purchases yet" style={{ paddingTop: 70 }} />}
            </div>
          </div>
        </Col>
        <Col xs={24} lg={12}>
          <div className="chart-card">
            <div className="chart-header"><Title level={5} style={{ margin: 0 }}>Top brands</Title></div>
            {(analytics?.topBrands ?? []).length ? (
              <Table
                rowKey={(r) => r.brandName}
                size="small"
                pagination={false}
                dataSource={analytics?.topBrands ?? []}
                columns={[
                  { title: 'Brand', dataIndex: 'brandName', key: 'brandName' },
                  { title: 'Units', dataIndex: 'quantitySold', key: 'quantitySold', align: 'right' },
                  { title: 'Spend', dataIndex: 'spend', key: 'spend', align: 'right', render: (v: number) => inr(v) },
                ]}
              />
            ) : <Empty description="No purchases yet" style={{ paddingTop: 40 }} />}
          </div>
        </Col>
      </Row>

      {/* Orders */}
      <Divider />
      <div className="chart-card">
        <div className="chart-header"><Title level={5} style={{ margin: 0 }}>Order history</Title></div>
        <Table<Order>
          rowKey="orderId"
          loading={ordersLoading}
          columns={orderColumns}
          dataSource={orders}
          scroll={{ x: 'max-content' }}
          pagination={{
            current: ordersPage + 1, pageSize: 10, total: ordersTotal,
            showTotal: (t) => `${t} orders`,
            onChange: (p) => setOrdersPage(p - 1),
          }}
        />
      </div>
    </div>
  );
}
