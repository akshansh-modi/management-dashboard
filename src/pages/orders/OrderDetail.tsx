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
  Breadcrumb,
  Timeline,
  Collapse,
  Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined,
  PhoneOutlined,
  MailOutlined,
  UserOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate, useParams, Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { orderService } from '../../services/orderService';
import type { Order, OrderItem, OrderStatus, OrderPayments } from '../../types';
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

const STATUS_HISTORY_COLORS: Record<string, string> = {
  PENDING: 'orange',
  CONFIRMED: 'blue',
  PROCESSING: 'purple',
  SHIPPED: 'cyan',
  DELIVERED: 'green',
  CANCELLED: 'red',
};

export default function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isSeller, userId } = useAuth();
  const { message } = App.useApp();

  const [order, setOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<OrderPayments | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [transition, setTransition] = useState<OrderStatus | null>(null);
  const [notes, setNotes] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const orderData = await orderService.getById(orderId);
      setOrder(orderData);

      try {
        const paymentsData = await orderService.getPayments(orderId);
        setPayments(paymentsData);
      } catch (err) {
        console.error('Failed to load order payments', err);
      }
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
      // F12: append tracking number to notes when shipping so it lands in statusHistory
      let finalNotes = notes || undefined;
      if (transition === 'SHIPPED' && trackingNumber.trim()) {
        finalNotes = [`Tracking: ${trackingNumber.trim()}`, notes].filter(Boolean).join(' | ');
      }
      if (isAdmin) {
        await orderService.adminUpdateStatus(order.orderId, transition, finalNotes);
      } else {
        await orderService.updateStatus(order.orderId, transition, finalNotes);
      }
      message.success(`Order marked ${transition}`);
      setTransition(null);
      setNotes('');
      setTrackingNumber('');
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
        <Spin size="large" />
        <div style={{ marginTop: 12, color: '#6B7280' }}>Loading order…</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="animate-fade-in">
        {/* F08: Breadcrumb even on error */}
        <Breadcrumb style={{ marginBottom: 12 }} items={[
          { title: <Link to="/orders">Orders</Link> },
          { title: orderId ?? 'Unknown' },
        ]} />
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
      {/* F08: Breadcrumb */}
      <Breadcrumb
        style={{ marginBottom: 12 }}
        items={[
          { title: <Link to="/orders">Orders</Link> },
          { title: order.orderId },
        ]}
      />

      <div className="page-header page-header-row" style={{ alignItems: 'flex-start' }}>
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
              {order.buyerCompanyName ? ` · ${order.buyerCompanyName}` : ''}
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

      {/* Status timeline steps */}
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
          <div className="chart-card" style={{ marginBottom: 20 }}>
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

          {/* F11: Status History audit trail */}
          {order.statusHistory && order.statusHistory.length > 0 && (
            <div className="chart-card">
              <Collapse
                ghost
                defaultActiveKey={[]}
                items={[{
                  key: 'history',
                  label: (
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      <HistoryOutlined style={{ marginRight: 8, color: '#6B7280' }} />
                      Status History
                      <Tag style={{ marginLeft: 8 }}>{order.statusHistory.length} events</Tag>
                    </span>
                  ),
                  children: (
                    <Timeline
                      style={{ paddingTop: 12 }}
                      items={[...order.statusHistory].reverse().map((h) => ({
                        color: STATUS_HISTORY_COLORS[h.status] ?? 'gray',
                        children: (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                              <Tag color={STATUS_HISTORY_COLORS[h.status] ?? 'default'} style={{ margin: 0 }}>
                                {h.status}
                              </Tag>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {h.changedAt ? dayjs(h.changedAt).format('DD MMM YYYY, HH:mm') : '—'}
                              </Text>
                            </div>
                            {h.notes && (
                              <Text style={{ fontSize: 13 }}>{h.notes}</Text>
                            )}
                            {h.changedBy && (
                              <div>
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                  by {h.changedBy}
                                </Text>
                              </div>
                            )}
                          </div>
                        ),
                      }))}
                    />
                  ),
                }]}
              />
            </div>
          )}
        </Col>

        {/* Right sidebar */}
        <Col xs={24} lg={8}>

          {/* F10: Customer Contact Card */}
          {(isAdmin || isSeller) && (order.buyerCompanyName || order.buyerPhone || order.buyerEmail) && (
            <div className="chart-card" style={{ marginBottom: 20 }}>
              <Title level={5} style={{ marginTop: 0 }}>Customer</Title>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {order.buyerCompanyName && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <UserOutlined style={{ color: '#6B7280' }} />
                    <Text strong>{order.buyerCompanyName}</Text>
                  </div>
                )}
                {order.buyerPhone ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <PhoneOutlined style={{ color: '#6B7280' }} />
                    <a href={`tel:${order.buyerPhone}`} style={{ fontSize: 13 }}>
                      {order.buyerPhone}
                    </a>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <PhoneOutlined style={{ color: '#D1D5DB' }} />
                    <Text type="secondary" style={{ fontSize: 13 }}>Phone not available</Text>
                  </div>
                )}
                {order.buyerEmail ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MailOutlined style={{ color: '#6B7280' }} />
                    <a href={`mailto:${order.buyerEmail}`} style={{ fontSize: 13 }}>
                      {order.buyerEmail}
                    </a>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MailOutlined style={{ color: '#D1D5DB' }} />
                    <Text type="secondary" style={{ fontSize: 13 }}>Email not available</Text>
                  </div>
                )}
                <Divider style={{ margin: '4px 0' }} />
                <Tooltip title="View full user profile">
                  <Button
                    type="link"
                    size="small"
                    style={{ padding: 0, height: 'auto' }}
                    onClick={() => navigate(`/users/${order.userId}`)}
                  >
                    View Profile →
                  </Button>
                </Tooltip>
              </div>
            </div>
          )}

          {/* Financial summary */}
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
                <Descriptions.Item label="GST">{inr(order.taxAmount)}</Descriptions.Item>
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

          {/* Payments Card */}
          {payments && payments.stages && payments.stages.length > 0 && (
            <div className="chart-card" style={{ marginBottom: 20 }}>
              <Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>Payments</Title>
              {payments.stages.map((stage, index) => (
                <div key={stage.stage} style={{ marginBottom: index === payments.stages.length - 1 ? 0 : 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong>{stage.label} ({stage.percentOfTotal}%)</Text>
                    <Tag color={stage.status === 'VERIFIED' ? 'green' : stage.status === 'PENDING' ? 'gold' : 'red'}>
                      {stage.status}
                    </Tag>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <Title level={4} style={{ margin: 0 }}>{inr(stage.amount)}</Title>
                  </div>
                  <Descriptions column={1} size="small" style={{ marginTop: 8 }} labelStyle={{ color: '#8C8C8C' }}>
                    {stage.tr && (
                      <Descriptions.Item label="UPI Ref">
                        <Text copyable>{stage.tr}</Text>
                      </Descriptions.Item>
                    )}
                    {stage.utr && (
                      <Descriptions.Item label={stage.stage === '10' ? 'Buyer UTR' : 'Reference'}>
                        <Text copyable>{stage.utr}</Text>
                      </Descriptions.Item>
                    )}
                    {stage.method && <Descriptions.Item label="Method">{stage.method}</Descriptions.Item>}
                    {stage.verifiedAt && <Descriptions.Item label="Verified At">{dayjs(stage.verifiedAt).format('DD MMM YYYY, HH:mm')}</Descriptions.Item>}
                    {stage.verifiedBy && <Descriptions.Item label="Verified By">{stage.verifiedBy}</Descriptions.Item>}
                  </Descriptions>
                  {stage.stage === '10' && stage.status === 'PENDING' && stage.upiLink && (
                    <div style={{ marginTop: 8 }}>
                      <Button type="link" size="small" href={stage.upiLink} target="_blank" style={{ padding: 0 }}>
                        Open UPI Payment Link
                      </Button>
                    </div>
                  )}
                  {index < payments.stages.length - 1 && <Divider style={{ margin: '16px 0' }} />}
                </div>
              ))}
            </div>
          )}

          {/* Shipping Address */}
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
        onCancel={() => { setTransition(null); setTrackingNumber(''); }}
      >
        <Text type="secondary">
          {transition === 'CONFIRMED'
            ? 'Confirming will verify the advance payment for this order.'
            : `This will move the order to ${transition}.`}
        </Text>

        {/* F12: Tracking number field — shown only for SHIPPED transition */}
        {transition === 'SHIPPED' && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Text strong style={{ fontSize: 13 }}>Tracking / AWB Number</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>(optional but recommended)</Text>
            </div>
            <Input
              placeholder="e.g. DTDC123456789, FedEx 7489…"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              allowClear
            />
          </div>
        )}

        {(isAdmin || isSeller) && (
          <TextArea
            rows={3}
            placeholder={transition === 'CONFIRMED' ? 'Enter UTR/payment reference' : 'Optional note (recorded in status history)'}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ marginTop: 12 }}
          />
        )}
      </Modal>
    </div>
  );
}
