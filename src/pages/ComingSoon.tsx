import { Typography, Card } from 'antd';
import { ToolOutlined } from '@ant-design/icons';
import { useLocation } from 'react-router-dom';

const { Title, Text } = Typography;

/** Human-friendly titles for the not-yet-built management sections. */
const TITLES: Record<string, string> = {
  categories: 'Categories',
  brands: 'Brands',
  'discount-policies': 'Discount Policies',
  users: 'User Management',
  carousels: 'Carousels',
  payments: 'Payment Verification',
  'homepage-config': 'Homepage Config',
  settings: 'Business Settings',
};

/**
 * Placeholder for management sections that are planned but not yet implemented.
 * Renders instead of silently redirecting to the dashboard, so the navigation
 * always reflects where the user actually is.
 */
export default function ComingSoon() {
  const { pathname } = useLocation();
  const slug = pathname.split('/').filter(Boolean)[0] ?? '';
  const title = TITLES[slug] ?? 'This section';

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <Title level={3} style={{ marginBottom: 4 }}>{title}</Title>
        <Text type="secondary">This section is coming soon</Text>
      </div>
      <Card style={{ textAlign: 'center', padding: 60 }}>
        <ToolOutlined style={{ fontSize: 48, color: '#D9D9D9', marginBottom: 16 }} />
        <Title level={4} type="secondary">{title} isn’t built yet</Title>
        <Text type="secondary">
          This area is planned for an upcoming release. It’s in the navigation so the
          dashboard structure is clear, but there’s nothing to manage here yet.
        </Text>
      </Card>
    </div>
  );
}
