import { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, Alert, Spin } from 'antd';
import { LockOutlined, UserOutlined, KeyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import type { AuthConfig } from '../services/authService';

const { Title, Paragraph } = Typography;

export default function Login() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && role && role !== 'buyer') {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, role, navigate]);

  // Fetch auth configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await authService.getAuthConfig();
        setAuthConfig(config);
      } catch {
        // Default to credentials if config fetch fails
        setAuthConfig({ activeProvider: 'credentials', requiresOtp: false, signupEnabled: false });
      } finally {
        setConfigLoading(false);
      }
    };
    loadConfig();
  }, []);

  const handleInitiate = async () => {
    try {
      const values = await form.validateFields(['username']);
      setLoading(true);
      setError(null);
      await authService.initiate(values.username);
      setOtpSent(true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      setError(null);

      const response = await authService.authenticate(
        values.username,
        values.password,
        values.otp
      );

      login(response.accessToken, response.refreshToken);
      // The useEffect above will handle redirect after state updates
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; error?: string } } };
      const msg =
        axiosErr?.response?.data?.message || axiosErr?.response?.data?.error || 'Authentication failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const isOtpMode = authConfig?.requiresOtp;

  return (
    <div className="login-page">
      <div className="login-card animate-fade-in">
        <div className="login-header">
          <div className="login-logo">SD</div>
          <Title level={3} style={{ marginBottom: 4 }}>
            Management Dashboard
          </Title>
          <Paragraph type="secondary">
            Sign in to manage your B2B platform
          </Paragraph>
        </div>

        {configLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
          </div>
        ) : (
          <>
            {error && (
              <Alert
                message={error}
                type="error"
                showIcon
                closable
                onClose={() => setError(null)}
                style={{ marginBottom: 20, borderRadius: 8 }}
              />
            )}

            <Form
              form={form}
              layout="vertical"
              size="large"
              onFinish={isOtpMode && !otpSent ? handleInitiate : handleLogin}
            >
              <Form.Item
                name="username"
                label="Username"
                rules={[
                  { required: true, message: 'Please enter your username' },
                ]}
              >
                <Input
                  prefix={<UserOutlined style={{ color: '#9CA3AF' }} />}
                  placeholder="Enter your username"
                  disabled={otpSent}
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>

              {/* Credentials mode — always show password */}
              {!isOtpMode && (
                <Form.Item
                  name="password"
                  label="Password"
                  rules={[{ required: true, message: 'Please enter your password' }]}
                >
                  <Input.Password
                    prefix={<LockOutlined style={{ color: '#9CA3AF' }} />}
                    placeholder="Enter your password"
                    style={{ borderRadius: 8 }}
                  />
                </Form.Item>
              )}

              {/* OTP mode — show OTP field after initiation */}
              {isOtpMode && otpSent && (
                <Form.Item
                  name="otp"
                  label="Verification Code"
                  rules={[{ required: true, message: 'Please enter the OTP' }]}
                >
                  <Input
                    prefix={<KeyOutlined style={{ color: '#9CA3AF' }} />}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    style={{ borderRadius: 8 }}
                  />
                </Form.Item>
              )}

              <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  style={{
                    height: 48,
                    borderRadius: 10,
                    fontWeight: 600,
                    fontSize: 15,
                  }}
                >
                  {isOtpMode && !otpSent ? 'Send OTP' : 'Sign In'}
                </Button>
              </Form.Item>
            </Form>

            <Paragraph
              type="secondary"
              style={{ textAlign: 'center', marginTop: 20, fontSize: 12 }}
            >
              Admin & Seller accounts only. Buyers cannot access this dashboard.
            </Paragraph>
          </>
        )}
      </div>
    </div>
  );
}
