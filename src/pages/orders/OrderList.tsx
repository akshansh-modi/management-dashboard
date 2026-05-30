import { useCallback, useEffect, useState } from 'react';
import { Typography, Table, Tag, Tabs, Button, App } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { orderService } from '../../services/orderService';
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
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = isAdmin
        ? await orderService.listAll({
            status: statusFilter === 'ALL' ? undefined : statusFilter,
            page,
            size: pageSize,
          })
        : await orderService.listForSeller({ page, size: pageSize });
      // Seller endpoint isn't status-filtered server-side, so filter client-side.
      let content = res.content;
      if (!isAdmin && statusFilter !== 'ALL') {
        content = content.filter((o) => o.status === statusFilter);
      }
      setOrders(content);
      setTotal(res.totalElements);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      message.error(err?.response?.data?.message || err?.message || 'Failed to load orders');
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
    {
      title: 'Date',
      dataIndex: 'orderDate',
      key: 'orderDate',
      responsive: ['md'],
      render: (v?: string) => (v ? dayjs(v).format('DD MMM YYYY, HH:mm') : '—'),
    },
    {
      title: 'Items',
      key: 'items',
      align: 'center',
      responsive: ['lg'],
      render: (_, o) => o.items?.length ?? 0,
    },
    {
      title: 'Total',
      dataIndex: 'finalTotal',
      key: 'finalTotal',
      align: 'right',
      render: (v?: number) =>
        v != null ? <Text strong>₹{Number(v).toLocaleString('en-IN')}</Text> : '—',
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
          dataSource={orders}
          scroll={{ x: 'max-content' }}
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
