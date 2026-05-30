import { Typography, Card } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

/**
 * Placeholder for Order Management page — will be built in Phase 6.
 */
export default function OrderList() {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <Title level={3}>Orders</Title>
        <Text type="secondary">Track and manage orders</Text>
      </div>
      <Card style={{ textAlign: 'center', padding: 60 }}>
        <ShoppingCartOutlined style={{ fontSize: 48, color: '#D9D9D9', marginBottom: 16 }} />
        <Title level={4} type="secondary">Order Management</Title>
        <Text type="secondary">Order listing, status transitions, and invoice generation coming soon.</Text>
      </Card>
    </div>
  );
}
