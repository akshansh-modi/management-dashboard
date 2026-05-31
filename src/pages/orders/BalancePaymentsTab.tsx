import { useCallback, useEffect, useState } from 'react';
import {
  Table, Button, Typography, Space, App, Modal, Input, Select,
  Descriptions, Statistic, Row, Col,
} from 'antd';
import { CheckCircleOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { paymentService } from '../../services/paymentService';
import type { BalancePayment } from '../../types';

const { Text } = Typography;
const { TextArea } = Input;

const inr = (v?: number) => (v != null ? `₹${Number(v).toLocaleString('en-IN')}` : '—');

const METHODS = [
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer / NEFT / RTGS' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' },
];

export default function BalancePaymentsTab() {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [rows, setRows] = useState<BalancePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<BalancePayment | null>(null);
  const [utr, setUtr] = useState('');
  const [method, setMethod] = useState<string>('UPI');
  const [submitting, setSubmitting] = useState(false);

  const pendingCount = rows.length;
  const totalBalanceDue = rows.reduce((s, r) => s + (r.balanceAmount ?? 0), 0);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await paymentService.getBalancePayments());
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      message.error(err?.response?.data?.message || err?.message || 'Failed to load balance payments');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleVerify = async () => {
    if (!verifying) return;
    if (!utr.trim()) {
      message.warning('Enter the UTR / reference for this payment');
      return;
    }
    setSubmitting(true);
    try {
      await paymentService.verifyBalancePayment(verifying.orderId, utr.trim(), method);
      message.success(`Balance verified for ${verifying.orderId}`);
      setVerifying(null);
      setUtr('');
      setMethod('UPI');
      fetch();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      message.error(err?.response?.data?.message || err?.message || 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<BalancePayment> = [
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
            <div><Text type="secondary" style={{ fontSize: 12 }}>{p.buyerPhone}</Text></div>
          )}
        </div>
      ),
    },
    {
      title: 'Delivered',
      dataIndex: 'deliveredAt',
      key: 'deliveredAt',
      responsive: ['lg'],
      render: (v?: string) => (v ? dayjs(v).format('DD MMM YYYY, HH:mm') : '—'),
    },
    {
      title: 'Balance (90%)',
      dataIndex: 'balanceAmount',
      key: 'balanceAmount',
      align: 'right',
      render: (v?: number) => <Text strong>{inr(v)}</Text>,
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
      title: 'Invoice',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      responsive: ['lg'],
      render: (v?: string) => v || '—',
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, p) => (
        <Space>
          <Button type="text" icon={<EyeOutlined />} onClick={() => navigate(`/orders/${p.orderId}`)}>
            View
          </Button>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => { setVerifying(p); setUtr(''); setMethod('UPI'); }}
          >
            Verify balance
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header-row" style={{ marginBottom: 16 }}>
        <Text type="secondary">
          Delivered orders whose 90% balance is awaiting finance verification
        </Text>
        <Button icon={<ReloadOutlined />} onClick={fetch} loading={loading}>Refresh</Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12}>
          <div className="chart-card" style={{ textAlign: 'center', padding: '20px 16px' }}>
            <Statistic
              title="Balances Awaiting Verification"
              value={pendingCount}
              valueStyle={{ color: pendingCount > 0 ? '#fa8c16' : '#52c41a', fontWeight: 700 }}
              suffix="orders"
            />
          </div>
        </Col>
        <Col xs={24} sm={12}>
          <div className="chart-card" style={{ textAlign: 'center', padding: '20px 16px' }}>
            <Statistic
              title="Total Balance Due (90%)"
              value={totalBalanceDue}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#2f54eb', fontWeight: 700 }}
            />
          </div>
        </Col>
      </Row>

      <div className="chart-card" style={{ padding: 16 }}>
        <Table<BalancePayment>
          rowKey="orderId"
          loading={loading}
          columns={columns}
          dataSource={rows}
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 10, showTotal: (t) => `${t} balance${t === 1 ? '' : 's'} due` }}
        />
      </div>

      <Modal
        open={!!verifying}
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            Verify Balance Payment (90%)
          </Space>
        }
        okText="Confirm Verification"
        okButtonProps={{ loading: submitting }}
        onOk={handleVerify}
        onCancel={() => { setVerifying(null); setUtr(''); }}
        width={520}
      >
        {verifying && (
          <>
            <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Order">{verifying.orderId}</Descriptions.Item>
              <Descriptions.Item label="Buyer">
                {verifying.buyerCompanyName || '—'}
                {verifying.buyerPhone && (
                  <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>{verifying.buyerPhone}</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Invoice">{verifying.invoiceNumber || '—'}</Descriptions.Item>
              <Descriptions.Item label="Balance (90%)">
                <Text strong style={{ color: '#2f54eb' }}>{inr(verifying.balanceAmount)}</Text>
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                  of {inr(verifying.finalTotal)} order total
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginBottom: 8 }}>
              <Text strong>Payment method</Text>
            </div>
            <Select
              style={{ width: '100%', marginBottom: 16 }}
              value={method}
              onChange={setMethod}
              options={METHODS}
            />

            <div style={{ marginBottom: 8 }}>
              <Text strong>UTR / Reference</Text>
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                Saved on the balance payment record for reconciliation
              </Text>
            </div>
            <TextArea
              rows={2}
              placeholder="UTR / cheque no. / receipt reference"
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
            />
          </>
        )}
      </Modal>
    </div>
  );
}
