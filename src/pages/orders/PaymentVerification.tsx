import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Typography, Tag, Space, App, Modal, Input, Descriptions } from 'antd';
import { CheckCircleOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { paymentService } from '../../services/paymentService';
import type { PendingPayment } from '../../types';

const { Title, Text } = Typography;
const { TextArea } = Input;

const inr = (v?: number) => (v != null ? `₹${Number(v).toLocaleString('en-IN')}` : '—');

export default function PaymentVerification() {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const [verifying, setVerifying] = useState<PendingPayment | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPendingPayments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await paymentService.getPendingPayments();
      setPayments(data);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      message.error(err?.response?.data?.message || err?.message || 'Failed to load pending payments');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchPendingPayments();
  }, [fetchPendingPayments]);

  const handleVerify = async () => {
    if (!verifying) return;
    setSubmitting(true);
    try {
      await paymentService.verifyPayment(verifying.orderId, notes || 'Payment verified');
      message.success(`Payment verified and order ${verifying.orderId} confirmed`);
      setVerifying(null);
      setNotes('');
      fetchPendingPayments();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      message.error(err?.response?.data?.message || err?.message || 'Verification failed');
    } finally {
      setSubmitting(false);
    }
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
      dataIndex: 'buyerCompanyName',
      key: 'buyerCompanyName',
      responsive: ['md'],
      render: (v) => v || '—',
    },
    {
      title: 'Date',
      dataIndex: 'orderDate',
      key: 'orderDate',
      responsive: ['md'],
      render: (v?: string) => (v ? dayjs(v).format('DD MMM YYYY, HH:mm') : '—'),
    },
    {
      title: 'Payment Status',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      render: (v) => <Tag color={v === 'PENDING' ? 'orange' : 'blue'}>{v || 'AWAITING'}</Tag>,
    },
    {
      title: 'Payment Amount',
      dataIndex: 'paymentAmount',
      key: 'paymentAmount',
      align: 'right',
      render: (v?: number) => v != null ? <Text strong>{inr(v)}</Text> : '—',
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
      render: (_, payment) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/orders/${payment.orderId}`)}
          >
            View
          </Button>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => {
              setVerifying(payment);
              setNotes('');
            }}
          >
            Verify
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header-row">
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>Payment Verification</Title>
          <Text type="secondary">
            Verify offline Stage-10 payments before confirming orders
          </Text>
        </div>
      </div>

      <div className="chart-card" style={{ padding: 16 }}>
        <Table<PendingPayment>
          rowKey="orderId"
          loading={loading}
          columns={columns}
          dataSource={payments}
          scroll={{ x: 'max-content' }}
          pagination={{
            pageSize: 10,
            showTotal: (t) => `${t} pending payment${t === 1 ? '' : 's'}`,
          }}
        />
      </div>

      <Modal
        open={!!verifying}
        title="Verify Payment"
        okText="Confirm Verification"
        okButtonProps={{ loading: submitting }}
        onOk={handleVerify}
        onCancel={() => setVerifying(null)}
      >
        {verifying && (
          <>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Order">{verifying.orderId}</Descriptions.Item>
              <Descriptions.Item label="Buyer">{verifying.buyerCompanyName || '—'}</Descriptions.Item>
              <Descriptions.Item label="Payment ID">{verifying.paymentId || '—'}</Descriptions.Item>
              <Descriptions.Item label="Payment Amount">{inr(verifying.paymentAmount)}</Descriptions.Item>
              <Descriptions.Item label="Order Total">{inr(verifying.finalTotal)}</Descriptions.Item>
            </Descriptions>
            <TextArea
              rows={3}
              placeholder="Verification notes / UTR number (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </>
        )}
      </Modal>
    </div>
  );
}
