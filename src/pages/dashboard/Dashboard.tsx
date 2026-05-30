import { Row, Col, Statistic, Tag, Typography } from 'antd';
import {
  DollarOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  TeamOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
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

const { Title, Text } = Typography;

// Register Chart.js components
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, ChartTitle, Tooltip, Legend, Filler
);

// ─── Mock Data (will be replaced by API calls in Phase 4) ────────────

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

const revenueData = {
  labels: months,
  datasets: [
    {
      label: 'Revenue (₹)',
      data: [185000, 220000, 195000, 310000, 275000, 340000],
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

const orderStatusData = {
  labels: ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'],
  datasets: [
    {
      data: [12, 8, 15, 42, 3],
      backgroundColor: ['#FAAD14', '#2F54EB', '#722ED1', '#52C41A', '#FF4D4F'],
      borderWidth: 0,
      hoverOffset: 6,
    },
  ],
};

const topProductsData = {
  labels: ['CRI Dhoom Pump', 'Sumolex CPVC Pipe', 'Finolex PVC Pipe', 'Supreme CPVC Fittings', 'Astral Column Pipe'],
  datasets: [
    {
      label: 'Units Sold',
      data: [156, 134, 118, 96, 72],
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

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#9CA3AF', font: { size: 12 } },
    },
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

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: {
      grid: { color: '#F0F0F0' },
      ticks: { color: '#9CA3AF', font: { size: 12 } },
    },
    y: {
      grid: { display: false },
      ticks: { color: '#374151', font: { size: 12 } },
    },
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

// ─── Component ───────────────────────────────────────────────────────

export default function Dashboard() {
  const { isAdmin } = useAuth();

  const kpiCards = [
    {
      title: isAdmin ? 'Total Revenue' : 'My Revenue',
      value: 1525000,
      prefix: '₹',
      icon: <DollarOutlined />,
      color: '#2F54EB',
      bgColor: '#EBF0FF',
      trend: 12.5,
      trendUp: true,
    },
    {
      title: isAdmin ? 'Total Orders' : 'My Orders',
      value: 80,
      prefix: undefined,
      icon: <ShoppingCartOutlined />,
      color: '#722ED1',
      bgColor: '#F5EDFF',
      trend: 8.2,
      trendUp: true,
    },
    {
      title: isAdmin ? 'Active Products' : 'My Products',
      value: 247,
      prefix: undefined,
      icon: <ShoppingOutlined />,
      color: '#52C41A',
      bgColor: '#EDFFF0',
      trend: 3.1,
      trendUp: true,
    },
    ...(isAdmin
      ? [
          {
            title: 'Active Sellers',
            value: 14,
            prefix: undefined,
            icon: <TeamOutlined />,
            color: '#FAAD14',
            bgColor: '#FFF8E6',
            trend: 2,
            trendUp: true,
          },
        ]
      : [
          {
            title: 'Pending Payments',
            value: 3,
            prefix: undefined,
            icon: <ClockCircleOutlined />,
            color: '#FAAD14',
            bgColor: '#FFF8E6',
            trend: 1,
            trendUp: false,
          },
        ]),
  ];

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <Title level={3} style={{ marginBottom: 4 }}>
          {isAdmin ? 'Admin Dashboard' : 'Seller Dashboard'}
        </Title>
        <Text type="secondary">
          {isAdmin
            ? 'Platform overview and key metrics'
            : 'Your business performance at a glance'}
        </Text>
      </div>

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
                prefix={kpi.prefix}
                valueStyle={{ fontWeight: 700, fontSize: 28, color: '#1A1A2E' }}
                formatter={(value) =>
                  typeof value === 'number'
                    ? value.toLocaleString('en-IN')
                    : value
                }
              />
              <div className={`kpi-trend ${kpi.trendUp ? 'up' : 'down'}`}>
                {kpi.trendUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                {kpi.trend}% vs last month
              </div>
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
              <Line data={revenueData} options={chartOptions as Parameters<typeof Line>[0]['options']} />
            </div>
          </div>
        </Col>
        <Col xs={24} lg={8}>
          <div className="chart-card">
            <div className="chart-header">
              <Title level={5} style={{ margin: 0 }}>Orders by Status</Title>
            </div>
            <div style={{ height: 320 }}>
              <Doughnut data={orderStatusData} options={doughnutOptions} />
            </div>
          </div>
        </Col>
      </Row>

      {/* Top Products */}
      <Row gutter={[20, 20]}>
        <Col xs={24} lg={12}>
          <div className="chart-card">
            <div className="chart-header">
              <Title level={5} style={{ margin: 0 }}>Top Selling Products</Title>
              <Tag color="green">This Month</Tag>
            </div>
            <div style={{ height: 280 }}>
              <Bar data={topProductsData} options={barChartOptions} />
            </div>
          </div>
        </Col>
        <Col xs={24} lg={12}>
          <div className="chart-card">
            <div className="chart-header">
              <Title level={5} style={{ margin: 0 }}>Recent Activity</Title>
            </div>
            <div style={{ padding: '12px 0' }}>
              {[
                { text: 'New order #ORD-X8K2M9', time: '5 min ago', color: '#2F54EB' },
                { text: 'Payment verified for #ORD-R4T7J2', time: '1 hour ago', color: '#52C41A' },
                { text: 'Product "CRI Dhoom 1HP" stock updated', time: '2 hours ago', color: '#722ED1' },
                { text: 'New seller registered: Raj Enterprises', time: '4 hours ago', color: '#FAAD14' },
                { text: 'Order #ORD-P3N5Q8 shipped via PORTER', time: '6 hours ago', color: '#13C2C2' },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 0',
                    borderBottom: i < 4 ? '1px solid #F5F5F5' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: item.color,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13 }}>{item.text}</Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    {item.time}
                  </Text>
                </div>
              ))}
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
}
