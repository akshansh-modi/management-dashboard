import { useCallback, useEffect, useRef, useState } from 'react';
import { Typography, Table, Tag, Tabs, Button, App, Input } from 'antd';
import { EyeOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { orderService } from '../../services/orderService';
import { ErrorState, EmptyState } from '../../components/StateViews';
import type { Order, OrderStatus } from '../../types';

const { Title, Text } = Typography;

export const STATUS_TAG: Record<string, string> = {
  PENDING: 'gold',
  CONFIRMED: 'blue',
  PROCESSING: 'cyan',
  SHIPPED: 'purple',
  DELIVERED: 'green',
  CANCELLED: 'red',
};

const STATUS_TABS: { key: string; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

export default function OrderList() {
  const { isAdmin, userId } = useAuth();
  const navigate = useNavigate();
  const { message } = App.useApp();

  // Sellers see only their own line items and their portion of each order total,
  // matching the order-detail view and the multi-seller policy.
  const sellerItems = (o: Order) =>
    isAdmin || !userId ? o.items : o.items.filter((i) => i.sellerId === userId);
  const rowTotal = (o: Order) =>
    isAdmin || !userId ? o.finalTotal : sellerItems(o).reduce((s, i) => s + (i.subtotal ?? 0), 0);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // F09: search box — client-side filter on the current page.
  // TODO: promote to server-side when the backend adds a `q` param to GET /admin/orders
  const [searchText, setSearchText] = useState('');
  const [displaySearch, setDisplaySearch] = useState('');
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDisplaySearch(val);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => setSearchText(val.trim().toLowerCase()), 300);
  };

  const filteredOrders = searchText
    ? orders.filter(
        (o) =>
          o.orderId.toLowerCase().includes(searchText) ||
          (o.buyerCompanyName ?? '').toLowerCase().includes(searchText)
      )
    : orders;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = statusFilter === 'ALL' ? undefined : statusFilter;
      const res = isAdmin
        ? await orderService.listAll({ status, page, size: pageSize })
        : await orderService.listForSeller({ status, page, size: pageSize });
      setOrders(res.content);
      setTotal(res.totalElements);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(err?.response?.data?.message || err?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, statusFilter, page, pageSize, message]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const columns: ColumnsType<Order> = [
    {
      title: 'Order ID',
      dataIndex: 'orderId',
      key: 'orderId',
      render: (v) => <Text strong style={{ fontFamily: 'monospace' }}>{v}</Text>,
    },
    ...(isAdmin
      ? ([
          {
            title: 'Customer',
            dataIndex: 'buyerCompanyName',
            key: 'buyerCompanyName',
            responsive: ['md'],
            render: (v?: string) => v || <Text type="secondary">—</Text>,
          },
        ] as ColumnsType<Order>)
      : []),
    {
      title: 'Date',
      dataIndex: 'orderDate',
      key: 'orderDate',
      responsive: ['md'],
      render: (v?: string) => (v ? dayjs(v).format('DD MMM YYYY, HH:mm') : '—'),
    },
    {
      title: isAdmin ? 'Items' : 'Your items',
      key: 'items',
      align: 'center',
      responsive: ['lg'],
      render: (_, o) => sellerItems(o)?.length ?? 0,
    },
    {
      title: isAdmin ? 'Total' : 'Your total',
      key: 'total',
      align: 'right',
      render: (_, o) => {
        const v = rowTotal(o);
        return v != null ? <Text strong>₹{Number(v).toLocaleString('en-IN')}</Text> : '—';
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: OrderStatus) => <Tag color={STATUS_TAG[s] ?? 'default'}>{s}</Tag>,
    },
    {
      title: 'Action',
      key: 'action',
      align: 'right',
      render: (_, o) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/orders/${o.orderId}`)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <Title level={3} style={{ marginBottom: 4 }}>Orders</Title>
        <Text type="secondary">
          {isAdmin ? 'All orders across the platform' : 'Orders containing your products'}
        </Text>
      </div>

      <div className="chart-card" style={{ padding: 16 }}>
        {/* F26: Standardised error state */}
        {error && (
          <ErrorState
            message="Couldn't load orders"
            description={error}
            onRetry={fetchOrders}
            style={{ marginBottom: 16 }}
          />
        )}
        {/* F09: Search box — filters order ID / company name on the current page */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 12 }}>
          <Input
            allowClear
            prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
            placeholder="Search order ID or customer…"
            value={displaySearch}
            onChange={handleSearchChange}
            style={{ maxWidth: 320, width: '100%' }}
          />
        </div>
        <Tabs
          activeKey={statusFilter}
          items={STATUS_TABS}
          onChange={(k) => {
            setStatusFilter(k);
            setPage(0);
          }}
        />
        <Table<Order>
          rowKey="orderId"
          loading={loading}
          columns={columns}
          dataSource={filteredOrders}
          scroll={{ x: 'max-content' }}
          locale={{
            emptyText: (
              <EmptyState
                entity="orders"
                hint={statusFilter !== 'ALL' ? `No ${statusFilter.toLowerCase()} orders found. Try a different status filter.` : undefined}
                style={{ padding: '32px 0' }}
              />
            ),
          }}
          onRow={(o) => ({
            onClick: () => navigate(`/orders/${o.orderId}`),
            style: { cursor: 'pointer' },
          })}
          pagination={{
            current: page + 1,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `${t} orders`,
            onChange: (p, ps) => {
              setPage(p - 1);
              setPageSize(ps);
            },
          }}
        />
      </div>
    </div>
  );
}
