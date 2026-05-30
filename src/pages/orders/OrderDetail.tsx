import { useCallback, useEffect, useState } from 'react';
import {
  Typography,
  Tag,
  Button,
  Space,
  Row,
  Col,
  Table,
  Steps,
  Descriptions,
  Spin,
  Alert,
  Modal,
  Input,
  Divider,
  App,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { orderService } from '../../services/orderService';
import type { Order, OrderItem, OrderStatus } from '../../types';
import { STATUS_TAG } from './OrderList';

const { Title, Text } = Typography;
const { TextArea } = Input;

const FLOW: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

const NEXT_STATUSES: Record<string, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

const inr = (v?: number) => (v != null ? `₹${Number(v).toLocaleString('en-IN')}` : '—');

export default function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isSeller, userId } = useAuth();
  const { message } = App.useApp();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [transition, setTransition] = useState<OrderStatus | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      setOrder(await orderService.getById(orderId));
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(err?.response?.data?.message || err?.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const confirmTransition = async () => {
    if (!order || !transition) return;
    setSubmitting(true);
    try {
      if (isAdmin) {
        await orderService.adminUpdateStatus(order.orderId, transition, notes || undefined);
      } else {
        await orderService.updateStatus(order.orderId, transition);
      }
      message.success(`Order marked ${transition}`);
      setTransition(null);
      setNotes('');
      fetchOrder();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      message.error(err?.response?.data?.message || err?.message || 'Status update failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin tip="Loading order…" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="animate-fade-in">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/orders')}>
          Back to orders
        </Button>
        <Alert type="error" showIcon message={error || 'Order not found'} style={{ marginTop: 16 }} />
      </div>
    );
  }

  // Sellers see only their own line items (and their portion of the total)
  const items: OrderItem[] =
    isSeller && !isAdmin && userId
      ? order.items.filter((i) => i.sellerId === userId)
      : order.items;
  const sellerPortion = items.reduce((sum, i) => sum + (i.subtotal ?? 0), 0);

  const isCancelled = order.status === 'CANCELLED';
  const currentStep = FLOW.indexOf(order.status as OrderStatus);
  const nextStatuses = NEXT_STATUSES[order.status] ?? [];

  const itemColumns: ColumnsType<OrderItem> = [
    {
      title: 'Product',
      key: 'product',
      render: (_, i) => (
        <div>
          <Text strong>{i.productName}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {i.brandName ? `${i.brandName} · ` : ''}SKU: {i.sku || '—'}
          </Text>
        </div>
      ),
    },
    { title: 'Qty', dataIndex: 'quantity', key: 'quantity', align: 'center' },
    {
      title: 'Unit price',
      dataIndex: 'finalUnitPrice',
      key: 'finalUnitPrice',
      align: 'right',
      render: (v) => inr(v),
    },
    {
      title: 'Discount',
      dataIndex: 'discountApplied',
      key: 'discountApplied',
      align: 'right',
      responsive: ['md'],
      render: (v?: number) => (v ? `${v}%` : '—'),
    },
    {
      title: 'Subtotal',
      dataIndex: 'subtotal',
      key: 'subtotal',
      align: 'right',
      render: (v) => <Text strong>{inr(v)}</Text>,
    },
  ];

  return (
    <div className="animate-fade-in">
      <div
        className="page-header page-header-row"
        style={{ alignItems: 'flex-start' }}
      >
        <div style={{ minWidth: 0 }}>
          <Space wrap style={{ marginBottom: 4 }}>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/orders')} />
            <Title level={3} style={{ margin: 0, fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {order.orderId}
            </Title>
            <Tag color={STATUS_TAG[order.status] ?? 'default'}>{order.status}</Tag>
          </Space>
          <div>
            <Text type="secondary">
              Placed {order.orderDate ? dayjs(order.orderDate).format('DD MMM YYYY, HH:mm') : '—'}
              {order.invoiceNumber ? ` · Invoice ${order.invoiceNumber}` : ''}
            </Text>
          </div>
        </div>
        <Space wrap>
          {nextStatuses.map((s) => (
            <Button
              key={s}
              type={s === 'CANCELLED' ? 'default' : 'primary'}
              danger={s === 'CANCELLED'}
              onClick={() => {
                setNotes('');
                setTransition(s);
              }}
            >
              Mark {s.charAt(0) + s.slice(1).toLowerCase()}
            </Button>
          ))}
        </Space>
      </div>

      {/* Status timeline */}
      <div className="chart-card" style={{ marginBottom: 20 }}>
        {isCancelled ? (
          <Alert type="error" showIcon message="This order was cancelled" />
        ) : (
          <Steps
            current={currentStep < 0 ? 0 : currentStep}
            items={FLOW.map((s) => ({ title: s.charAt(0) + s.slice(1).toLowerCase() }))}
          />
        )}
      </div>

      <Row gutter={[20, 20]}>
        {/* Items */}
        <Col xs={24} lg={16}>
          <div className="chart-card">
            <div className="chart-header">
              <Title level={5} style={{ margin: 0 }}>
                Items {isSeller && !isAdmin ? '(your products)' : ''}
              </Title>
              <Tag>{items.length} item{items.length === 1 ? '' : 's'}</Tag>
            </div>
            <Table<OrderItem>
              rowKey={(i) => `${i.productId}-${i.variantId ?? ''}`}
              columns={itemColumns}
              dataSource={items}
              pagination={false}
              size="middle"
              scroll={{ x: 'max-content' }}
            />
          </div>
        </Col>

        {/* Summary + address */}
        <Col xs={24} lg={8}>
          <div className="chart-card" style={{ marginBottom: 20 }}>
            <Title level={5} style={{ marginTop: 0 }}>
              {isSeller && !isAdmin ? 'Your portion' : 'Financial summary'}
            </Title>
            {isSeller && !isAdmin ? (
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Your items subtotal">{inr(sellerPortion)}</Descriptions.Item>
              </Descriptions>
            ) : (
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Subtotal">{inr(order.subtotal)}</Descriptions.Item>
                <Descriptions.Item label="Discount">-{inr(order.totalDiscount)}</Descriptions.Item>
                <Descriptions.Item label="Shipping">
                  {inr(order.shippingCharge)}
                  {order.shippingPercentage ? ` (${order.shippingPercentage}%)` : ''}
                </Descriptions.Item>
                <Descriptions.Item label="CGST">{inr(order.cgstAmount)}</Descriptions.Item>
                <Descriptions.Item label="SGST">{inr(order.sgstAmount)}</Descriptions.Item>
                <Descriptions.Item label="IGST">{inr(order.igstAmount)}</Descriptions.Item>
              </Descriptions>
            )}
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong>{isSeller && !isAdmin ? 'Your total' : 'Grand total'}</Text>
              <Title level={4} style={{ margin: 0, color: '#2F54EB' }}>
                {isSeller && !isAdmin ? inr(sellerPortion) : inr(order.finalTotal)}
              </Title>
            </div>
            {order.paymentMethod && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Payment: {order.paymentMethod}
              </Text>
            )}
          </div>

          <div className="chart-card">
            <Title level={5} style={{ marginTop: 0 }}>Shipping address</Title>
            {order.shippingAddress ? (
              <Text type="secondary">
                {[
                  order.shippingAddress.addressLine,
                  order.shippingAddress.city,
                  order.shippingAddress.state,
                  order.shippingAddress.pincode,
                ]
                  .filter(Boolean)
                  .join(', ') || '—'}
              </Text>
            ) : (
              <Text type="secondary">—</Text>
            )}
          </div>
        </Col>
      </Row>

      {/* Transition modal */}
      <Modal
        open={transition !== null}
        title={`Change status to ${transition ?? ''}?`}
        okText="Confirm"
        okButtonProps={{ danger: transition === 'CANCELLED', loading: submitting }}
        onOk={confirmTransition}
        onCancel={() => setTransition(null)}
      >
        <Text type="secondary">
          {transition === 'CONFIRMED'
            ? 'Confirming will verify the advance payment for this order.'
            : `This will move the order to ${transition}.`}
        </Text>
        {isAdmin && (
          <TextArea
            rows={3}
            placeholder="Optional note (recorded in status history)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ marginTop: 12 }}
          />
        )}
      </Modal>
    </div>
  );
}
