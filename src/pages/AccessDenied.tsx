import { Button, Typography } from 'antd';
import { StopOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Title, Paragraph } = Typography;

/**
 * Access Denied page for unauthorized roles (primarily buyers).
 */
export default function AccessDenied() {
  const { logout, role } = useAuth();

  return (
    <div className="access-denied">
      <div className="denied-card animate-fade-in">
        <StopOutlined className="denied-icon" />
        <Title level={2}>Access Denied</Title>
        <Paragraph type="secondary">
          {role === 'buyer'
            ? 'This dashboard is only available for Admin and Seller accounts. Please use the buyer app to continue shopping.'
            : 'You do not have sufficient permissions to access this page. Contact your administrator for access.'}
        </Paragraph>
        <Button
          type="primary"
          size="large"
          icon={<ArrowLeftOutlined />}
          onClick={logout}
          style={{ borderRadius: 8 }}
        >
          Back to Login
        </Button>
      </div>
    </div>
  );
}
