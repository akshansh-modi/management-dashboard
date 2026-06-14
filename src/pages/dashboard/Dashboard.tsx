import { useEffect, useMemo, useState } from 'react';
import { Row, Col, Statistic, Tag, Typography, Spin, Alert, Empty, Badge } from 'antd';
import {
  DollarOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { useAuth } from '../../context/AuthContext';
import { analyticsService } from '../../services/analyticsService';
import type { AnalyticsSummary } from '../../types';

const { Title, Text } = Typography;

// Register Chart.js components
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, ChartTitle, Tooltip, Legend, Filler
);

// ─── Static chart styling (data is injected from the API) ─────────────

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#FAAD14',
  CONFIRMED: '#2F54EB',
  PROCESSING: '#13C2C2',
  SHIPPED: '#722ED1',
  DELIVERED: '#52C41A',
  CANCELLED: '#FF4D4F',
};

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#9CA3AF', font: { size: 12 } } },
    y: {
      grid: { color: '#F0F0F0' },
      ticks: {
        color: '#9CA3AF',
        font: { size: 12 },
        callback: (value: number | string) => '₹' + Number(value).toLocaleString('en-IN'),
      },
    },
  },
};

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { color: '#F0F0F0' }, ticks: { color: '#9CA3AF', font: { size: 12 } } },
    y: { grid: { display: false }, ticks: { color: '#374151', font: { size: 12 } } },
  },
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '65%',
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        padding: 16,
        usePointStyle: true,
        pointStyleWidth: 10,
        font: { size: 12 },
        color: '#6B7280',
      },
    },
  },
};

const formatINR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

// ─── Component ───────────────────────────────────────────────────────

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    analyticsService
      .getSummary(isAdmin)
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(
            e?.response?.data?.message ||
              e?.message ||
              'Failed to load analytics. Is the backend running?'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const kpiCards = useMemo(() => {
    const k = summary?.kpis;
    const series = summary?.revenueByMonth ?? [];

    // F02: compute month-over-month revenue trend from the revenueByMonth series
    const revTrend = (() => {
      if (series.length < 2) return null;
      const current = series[series.length - 1].value;
      const prev = series[series.length - 2].value;
      if (prev === 0) return null;
      const pct = ((current - prev) / prev) * 100;
      return { direction: pct >= 0 ? 'up' : 'down', pct: Math.abs(Math.round(pct)) };
    })();

    // Delivered count vs total orders for orders trend
    const deliveredCount = (summary?.ordersByStatus ?? []).find((s) => s.status === 'DELIVERED')?.count ?? 0;
    const totalOrders = k?.totalOrders ?? 0;
    const pendingCount = (summary?.ordersByStatus ?? []).find((s) => s.status === 'PENDING')?.count ?? 0;

    const cards = [
      {
        title: isAdmin ? 'Total Revenue' : 'My Revenue',
        value: k ? formatINR(k.totalRevenue) : '—',
        icon: <DollarOutlined />,
        color: '#2F54EB',
        bgColor: '#EBF0FF',
        trend: revTrend,
      },
      {
        title: isAdmin ? 'Total Orders' : 'My Orders',
        value: k ? k.totalOrders.toLocaleString('en-IN') : '—',
        icon: <ShoppingCartOutlined />,
        color: '#722ED1',
        bgColor: '#F5EDFF',
        trend: totalOrders > 0 && deliveredCount > 0
          ? { direction: 'up' as const, pct: Math.round((deliveredCount / totalOrders) * 100), label: 'fulfilled' }
          : null,
      },
      {
        title: isAdmin ? 'Active Products' : 'My Products',
        value: k ? k.activeProducts.toLocaleString('en-IN') : '—',
        icon: <ShoppingOutlined />,
        color: '#52C41A',
        bgColor: '#EDFFF0',
        trend: null,
      },
      isAdmin
        ? {
            title: 'Active Sellers',
            value: k?.activeSellers != null ? k.activeSellers.toLocaleString('en-IN') : '—',
            icon: <TeamOutlined />,
            color: '#FAAD14',
            bgColor: '#FFF8E6',
            trend: null,
          }
        : {
            title: 'Pending Payments',
            value: k ? k.pendingPayments.toLocaleString('en-IN') : '—',
            icon: <ClockCircleOutlined />,
            color: '#FAAD14',
            bgColor: '#FFF8E6',
            trend: k && pendingCount > 0
              ? { direction: 'down' as const, pct: pendingCount, label: 'pending' }
              : null,
          },
    ];
    return cards;
  }, [summary, isAdmin]);

  const revenueData = useMemo(() => {
    const series = summary?.revenueByMonth ?? [];
    return {
      labels: series.map((p) => p.label),
      datasets: [
        {
          label: 'Revenue (₹)',
          data: series.map((p) => p.value),
          borderColor: '#2F54EB',
          backgroundColor: 'rgba(47, 84, 235, 0.08)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#2F54EB',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
          pointRadius: 5,
        },
      ],
    };
  }, [summary]);

  const orderStatusData = useMemo(() => {
    const series = (summary?.ordersByStatus ?? []).filter((s) => s.count > 0);
    return {
      labels: series.map((s) => s.status.charAt(0) + s.status.slice(1).toLowerCase()),
      datasets: [
        {
          data: series.map((s) => s.count),
          backgroundColor: series.map((s) => STATUS_COLORS[s.status] ?? '#8C8C8C'),
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    };
  }, [summary]);

  const topProductsData = useMemo(() => {
    const series = summary?.topProducts ?? [];
    return {
      labels: series.map((p) => p.productName ?? p.productId),
      datasets: [
        {
          label: 'Units Sold',
          data: series.map((p) => p.quantitySold),
          backgroundColor: [
            'rgba(47, 84, 235, 0.85)',
            'rgba(47, 84, 235, 0.7)',
            'rgba(47, 84, 235, 0.55)',
            'rgba(47, 84, 235, 0.4)',
            'rgba(47, 84, 235, 0.25)',
          ],
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    };
  }, [summary]);

  const hasRevenue = (summary?.revenueByMonth ?? []).some((p) => p.value > 0);
  const hasStatus = (summary?.ordersByStatus ?? []).some((s) => s.count > 0);
  const hasTopProducts = (summary?.topProducts ?? []).length > 0;

  // F01: attention band data — derived from analytics summary already in memory
  const attentionItems = useMemo(() => {
    if (!summary || loading) return [];
    const items: { label: string; count: number; path: string; icon: React.ReactNode }[] = [];
    const pendingOrders = (summary.ordersByStatus ?? []).find((s) => s.status === 'PENDING')?.count ?? 0;
    if (pendingOrders > 0) {
      items.push({
        label: 'pending payment',
        count: pendingOrders,
        path: '/orders',
        icon: <ClockCircleOutlined />,
      });
    }
    if (isAdmin) {
      const k = summary.kpis;
      // Stock 0 products surfaced via kpis — if admin, nudge them to products
      // We use pendingPayments from kpis as a proxy for admin's pending orders queue
      if ((k?.pendingPayments ?? 0) > 0) {
        items.push({
          label: 'advance payments awaiting verification',
          count: k.pendingPayments,
          path: '/payments',
          icon: <DollarOutlined />,
        });
      }
    }
    return items;
  }, [summary, loading, isAdmin]);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <Title level={3} style={{ marginBottom: 4 }}>
          {isAdmin ? 'Admin Dashboard' : 'Seller Dashboard'}
        </Title>
        <Text type="secondary">
          {isAdmin ? 'Platform overview and key metrics' : 'Your business performance at a glance'}
        </Text>
      </div>

      {/* F01: Attention band — only shows when there's something actionable */}
      {!loading && attentionItems.length > 0 && (
        <div className="attention-band">
          <span className="attention-band-title">
            <WarningOutlined />
            Needs attention
          </span>
          {attentionItems.map((item) => (
            <button
              key={item.path + item.label}
              className="attention-pill"
              onClick={() => navigate(item.path)}
              type="button"
            >
              {item.icon}
              <Badge count={item.count} style={{ backgroundColor: '#FAAD14', marginRight: 2 }} />
              {item.label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <Alert
          type="error"
          showIcon
          message="Couldn't load analytics"
          description={error}
          style={{ marginBottom: 20 }}
        />
      )}

      <Spin spinning={loading} tip="Loading analytics…">
        {/* KPI Cards */}
        <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
          {kpiCards.map((kpi, index) => (
            <Col xs={24} sm={12} lg={6} key={kpi.title}>
              <div className={`kpi-card animate-fade-in-delay-${index + 1}`}>
                <div className="kpi-icon" style={{ background: kpi.bgColor, color: kpi.color }}>
                  {kpi.icon}
                </div>
                <Statistic
                  title={
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      {kpi.title}
                    </Text>
                  }
                  value={kpi.value}
                  valueStyle={{ fontWeight: 700, fontSize: 28, color: '#1A1A2E' }}
                />
                {/* F02: trend pill — uses the pre-existing .kpi-trend CSS classes */}
                {'trend' in kpi && kpi.trend && (
                  <div
                    className={`kpi-trend ${
                      kpi.trend.direction === 'up' ? 'up' : 'down'
                    }`}
                  >
                    {kpi.trend.direction === 'up' ? '▲' : '▼'}{' '}
                    {'label' in kpi.trend ? `${kpi.trend.pct}% ${kpi.trend.label}` : `${kpi.trend.pct}% MoM`}
                  </div>
                )}
              </div>
            </Col>
          ))}
        </Row>

        {/* Charts Row */}
        <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={16}>
            <div className="chart-card">
              <div className="chart-header">
                <Title level={5} style={{ margin: 0 }}>Revenue Overview</Title>
                <Tag color="blue">Last 6 Months</Tag>
              </div>
              <div style={{ height: 320 }}>
                {hasRevenue ? (
                  <Line data={revenueData} options={lineOptions as Parameters<typeof Line>[0]['options']} />
                ) : (
                  <Empty description="No revenue in this period" style={{ paddingTop: 90 }} />
                )}
              </div>
            </div>
          </Col>
          <Col xs={24} lg={8}>
            <div className="chart-card">
              <div className="chart-header">
                <Title level={5} style={{ margin: 0 }}>Orders by Status</Title>
              </div>
              <div style={{ height: 320 }}>
                {hasStatus ? (
                  <Doughnut data={orderStatusData} options={doughnutOptions} />
                ) : (
                  <Empty description="No orders yet" style={{ paddingTop: 90 }} />
                )}
              </div>
            </div>
          </Col>
        </Row>

        {/* Top Products */}
        <Row gutter={[20, 20]}>
          <Col xs={24}>
            <div className="chart-card">
              <div className="chart-header">
                <Title level={5} style={{ margin: 0 }}>Top Selling Products</Title>
                <Tag color="green">By units sold</Tag>
              </div>
              <div style={{ height: 300 }}>
                {hasTopProducts ? (
                  <Bar data={topProductsData} options={barOptions} />
                ) : (
                  <Empty description="No sales data yet" style={{ paddingTop: 80 }} />
                )}
              </div>
            </div>
          </Col>
        </Row>
      </Spin>
    </div>
  );
}
