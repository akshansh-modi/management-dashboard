import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Table,
  Button,
  Typography,
  Tag,
  Space,
  App,
  Modal,
  Input,
  Descriptions,
  Statistic,
  Row,
  Col,
  Tooltip,
  Alert,
  Tabs,
} from 'antd';
import {
  CheckCircleOutlined,
  EyeOutlined,
  ReloadOutlined,
  CopyOutlined,
  ClockCircleOutlined,
  StopOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';
import { paymentService } from '../../services/paymentService';
import BalancePaymentsTab from './BalancePaymentsTab';
import type { PendingPayment } from '../../types';

dayjs.extend(relativeTime);
dayjs.extend(duration);

const { Title, Text } = Typography;
const { TextArea } = Input;

const inr = (v?: number) =>
  v != null ? `₹${Number(v).toLocaleString('en-IN')}` : '—';

/** Returns a human-readable countdown to expiry, or null if already expired / no expiry. */
function expiryLabel(expiresAt?: string): { label: string; urgent: boolean } | null {
  if (!expiresAt) return null;
  const exp = dayjs(expiresAt);
  if (dayjs().isAfter(exp)) return null; // already expired
  const diffMs = exp.diff(dayjs());
  const hrs = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  const label = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  return { label, urgent: diffMs < 3600000 }; // urgent if < 1 h
}

/** Auto-refresh interval — 60 s. */
const AUTO_REFRESH_MS = 60_000;

export default function PaymentVerification() {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<dayjs.Dayjs>(dayjs());

  const [verifying, setVerifying] = useState<PendingPayment | null>(null);
  const [utr, setUtr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // --- Derived KPIs ---
  const pendingCount = payments.filter((p) => !p.isExpired).length;
  const totalAdvanceDue = payments
    .filter((p) => !p.isExpired && p.paymentAmount != null)
    .reduce((s, p) => s + (p.paymentAmount ?? 0), 0);
  const totalOrderValue = payments
    .filter((p) => !p.isExpired)
    .reduce((s, p) => s + (p.finalTotal ?? 0), 0);

  const fetchPendingPayments = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await paymentService.getPendingPayments();
        setPayments(data);
        setLastRefresh(dayjs());
      } catch (e) {
        const err = e as { response?: { data?: { message?: string } }; message?: string };
        message.error(err?.response?.data?.message || err?.message || 'Failed to load pending payments');
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  // Initial load
  useEffect(() => {
    fetchPendingPayments();
  }, [fetchPendingPayments]);

  // 60-second auto-refresh
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    refreshIntervalRef.current = setInterval(() => fetchPendingPayments(true), AUTO_REFRESH_MS);
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [fetchPendingPayments]);

  const handleVerify = async () => {
    if (!verifying) return;
    setSubmitting(true);
    try {
      await paymentService.verifyPayment(verifying.orderId, utr || undefined);
      message.success(`Payment verified — order ${verifying.orderId} confirmed`);
      setVerifying(null);
      setUtr('');
      fetchPendingPayments();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      message.error(err?.response?.data?.message || err?.message || 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => message.success(`${label} copied`));
  };

  const columns: ColumnsType<PendingPayment> = [
    {
      title: 'Order ID',
      dataIndex: 'orderId',
      key: 'orderId',
      render: (v) => <Text strong style={{ fontFamily: 'monospace' }}>{v}</Text>,
    },
    {
      title: 'Buyer',
      key: 'buyer',
      responsive: ['md'],
      render: (_, p) => (
        <div>
          <Text>{p.buyerCompanyName || '—'}</Text>
          {p.buyerPhone && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>{p.buyerPhone}</Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Order Date',
      dataIndex: 'orderDate',
      key: 'orderDate',
      responsive: ['md'],
      render: (v?: string) => (v ? dayjs(v).format('DD MMM YYYY, HH:mm') : '—'),
    },
    {
      title: 'Expires',
      key: 'expires',
      responsive: ['lg'],
      render: (_, p) => {
        if (p.isExpired || p.paymentStatus === 'EXPIRED') {
          return <Tag color="red" icon={<StopOutlined />}>Expired</Tag>;
        }
        const info = expiryLabel(p.expiresAt);
        if (!info) return <Text type="secondary">—</Text>;
        return (
          <Tooltip title={`Expires ${dayjs(p.expiresAt).format('DD MMM, HH:mm')}`}>
            <Tag
              color={info.urgent ? 'orange' : 'default'}
              icon={info.urgent ? <WarningOutlined /> : <ClockCircleOutlined />}
            >
              {info.label}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: 'Payment Status',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      render: (v) => <Tag color={v === 'PENDING' ? 'orange' : v === 'VERIFIED' ? 'green' : 'blue'}>{v || 'AWAITING'}</Tag>,
    },
    {
      title: 'Advance (10%)',
      dataIndex: 'paymentAmount',
      key: 'paymentAmount',
      align: 'right',
      render: (v?: number) =>
        v != null ? <Text strong>{inr(v)}</Text> : '—',
    },
    {
      title: 'Order Total',
      dataIndex: 'finalTotal',
      key: 'finalTotal',
      align: 'right',
      responsive: ['lg'],
      render: (v?: number) => inr(v),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, payment) => {
        const expired = payment.isExpired || payment.paymentStatus === 'EXPIRED';
        const noPayment = !payment.paymentId;
        return (
          <Space>
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/orders/${payment.orderId}`)}
            >
              View
            </Button>
            {expired ? (
              <Tag color="red" style={{ margin: 0 }}>Expired</Tag>
            ) : noPayment ? (
              <Tooltip title="No Stage-10 payment record found for this order">
                <Tag color="default" style={{ margin: 0 }}>No payment</Tag>
              </Tooltip>
            ) : (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => {
                  setVerifying(payment);
                  setUtr('');
                }}
              >
                Verify
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header-row" style={{ marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>Payment Verification</Title>
          <Text type="secondary">
            Verify offline Stage-10 advance payments before confirming orders
            {' · '}
            <Text type="secondary" style={{ fontSize: 12 }}>
              Last refreshed {lastRefresh.format('HH:mm:ss')} · auto-refreshes every 60s
            </Text>
          </Text>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => fetchPendingPayments()}
          loading={loading}
        >
          Refresh
        </Button>
      </div>

      <Tabs
        defaultActiveKey="advance"
        items={[
          {
            key: 'advance',
            label: 'Advance (10%)',
            children: (
              <>
      {/* KPI cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <div className="chart-card" style={{ textAlign: 'center', padding: '20px 16px' }}>
            <Statistic
              title="Awaiting Verification"
              value={pendingCount}
              valueStyle={{ color: pendingCount > 0 ? '#fa8c16' : '#52c41a', fontWeight: 700 }}
              suffix="orders"
            />
          </div>
        </Col>
        <Col xs={24} sm={8}>
          <div className="chart-card" style={{ textAlign: 'center', padding: '20px 16px' }}>
            <Statistic
              title="Total Advance Due (10%)"
              value={totalAdvanceDue}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#2f54eb', fontWeight: 700 }}
            />
          </div>
        </Col>
        <Col xs={24} sm={8}>
          <div className="chart-card" style={{ textAlign: 'center', padding: '20px 16px' }}>
            <Statistic
              title="Total Order Value"
              value={totalOrderValue}
              precision={2}
              prefix="₹"
              valueStyle={{ fontWeight: 700 }}
            />
          </div>
        </Col>
      </Row>

      <div className="chart-card" style={{ padding: 16 }}>
        <Table<PendingPayment>
          rowKey="orderId"
          loading={loading}
          columns={columns}
          dataSource={payments}
          scroll={{ x: 'max-content' }}
          rowClassName={(p) =>
            p.isExpired || p.paymentStatus === 'EXPIRED' ? 'ant-table-row-disabled' : ''
          }
          pagination={{
            pageSize: 10,
            showTotal: (t) => `${t} pending payment${t === 1 ? '' : 's'}`,
          }}
        />
      </div>
              </>
            ),
          },
          {
            key: 'balance',
            label: 'Balance (90%)',
            children: <BalancePaymentsTab />,
          },
        ]}
      />

      {/* Verify modal */}
      <Modal
        open={!!verifying}
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            Verify Stage-10 Advance Payment
          </Space>
        }
        okText="Confirm Verification"
        okButtonProps={{ loading: submitting, disabled: !verifying }}
        cancelText="Cancel"
        onOk={handleVerify}
        onCancel={() => { setVerifying(null); setUtr(''); }}
        width={520}
      >
        {verifying && (() => {
          const exp = verifying.expiresAt ? dayjs(verifying.expiresAt) : null;
          const expiresIn = expiryLabel(verifying.expiresAt);
          return (
            <>
              <Descriptions column={1} size="small" style={{ marginBottom: 16 }} bordered>
                <Descriptions.Item label="Order">{verifying.orderId}</Descriptions.Item>
                <Descriptions.Item label="Buyer">
                  <div>
                    {verifying.buyerCompanyName || '—'}
                    {verifying.buyerPhone && (
                      <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                        {verifying.buyerPhone}
                      </Text>
                    )}
                  </div>
                </Descriptions.Item>
                <Descriptions.Item label="Invoice">{verifying.invoiceNumber || '—'}</Descriptions.Item>
                <Descriptions.Item label="Advance (10%)">
                  <Text strong style={{ color: '#2f54eb' }}>{inr(verifying.paymentAmount)}</Text>
                  <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                    of {inr(verifying.finalTotal)} order total
                  </Text>
                </Descriptions.Item>
                {verifying.tr && (
                  <Descriptions.Item label="Expected Ref (tr)">
                    <Space>
                      <Text code style={{ fontSize: 12 }}>{verifying.tr}</Text>
                      <Tooltip title="Copy expected transaction reference">
                        <Button
                          type="text"
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() => copyToClipboard(verifying.tr!, 'Transaction reference')}
                        />
                      </Tooltip>
                    </Space>
                  </Descriptions.Item>
                )}
                {verifying.upiLink && (
                  <Descriptions.Item label="UPI Link">
                    <Space>
                      <a
                        href={verifying.upiLink}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 12 }}
                      >
                        Open UPI Payment
                      </a>
                      <Tooltip title="Copy UPI link">
                        <Button
                          type="text"
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() => copyToClipboard(verifying.upiLink!, 'UPI link')}
                        />
                      </Tooltip>
                    </Space>
                  </Descriptions.Item>
                )}
                {exp && (
                  <Descriptions.Item label="Payment Expires">
                    <Space>
                      <Text>{exp.format('DD MMM YYYY, HH:mm')}</Text>
                      {expiresIn && (
                        <Tag color={expiresIn.urgent ? 'orange' : 'default'} icon={<ClockCircleOutlined />}>
                          {expiresIn.label} remaining
                        </Tag>
                      )}
                    </Space>
                  </Descriptions.Item>
                )}
              </Descriptions>

              {expiresIn?.urgent && (
                <Alert
                  type="warning"
                  showIcon
                  message="Less than 1 hour remaining before this payment expires — verify promptly."
                  style={{ marginBottom: 12 }}
                />
              )}

              <div style={{ marginBottom: 8 }}>
                <Text strong>UTR / Transaction Reference</Text>
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                  Match against the "Expected Ref" above and your bank statement
                </Text>
              </div>
              <TextArea
                rows={2}
                placeholder="Enter UTR or UPI transaction ID from the buyer's payment receipt"
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
              />
              <Text type="secondary" style={{ fontSize: 11, marginTop: 6, display: 'block' }}>
                The UTR will be stored on the payment record for reconciliation. Verifying will confirm the order.
              </Text>
            </>
          );
        })()}
      </Modal>
    </div>
  );
}
