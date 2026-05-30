import { Typography, Card } from 'antd';
import { ShoppingOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

/**
 * Placeholder for Product Management page — will be built in Phase 5.
 */
export default function ProductList() {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <Title level={3}>Products</Title>
        <Text type="secondary">Manage your product catalog</Text>
      </div>
      <Card style={{ textAlign: 'center', padding: 60 }}>
        <ShoppingOutlined style={{ fontSize: 48, color: '#D9D9D9', marginBottom: 16 }} />
        <Title level={4} type="secondary">Product Management</Title>
        <Text type="secondary">Product CRUD, bulk upload, and variant management coming next.</Text>
      </Card>
    </div>
  );
}
