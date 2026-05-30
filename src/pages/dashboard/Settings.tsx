import { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, Card, message, Row, Col } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { userService } from '../../services/userService';

const { Title, Text } = Typography;

export default function Settings() {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await userService.getSettings();
        form.setFieldsValue({
          companyName: data.companyName || '',
          gstin: data.gstin || '',
          pan: data.pan || '',
        });
      } catch (err) {
        message.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [form]);

  const handleSave = async (values: any) => {
    setSaving(true);
    try {
      await userService.updateSettings(values);
      message.success('Settings updated successfully');
    } catch (err) {
      message.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header-row">
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>Business Settings</Title>
          <Text type="secondary">
            Manage your business profile and financial details
          </Text>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card 
            title="Profile Details" 
            bordered={false} 
            className="chart-card"
            style={{ marginBottom: 24 }}
            loading={loading}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSave}
            >
              <Form.Item
                name="companyName"
                label="Company / Business Name"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input placeholder="Enter registered business name" />
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="gstin"
                    label="GSTIN Number"
                    rules={[{ required: true, message: 'Required' }]}
                  >
                    <Input placeholder="e.g. 29ABCDE1234F1Z5" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="pan"
                    label="PAN Number"
                    rules={[{ required: true, message: 'Required' }]}
                  >
                    <Input placeholder="e.g. ABCDE1234F" />
                  </Form.Item>
                </Col>
              </Row>

              <div style={{ marginTop: 24 }}>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                  Save Changes
                </Button>
              </div>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Information" bordered={false} className="chart-card">
            <Typography.Paragraph>
              <Text strong>Note:</Text> Modifying your GSTIN or PAN may require re-verification by the platform administration team. Your payouts might be paused during verification.
            </Typography.Paragraph>
            <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
              For support regarding business profile changes, contact <a>support@sanitarydirect.com</a>.
            </Typography.Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
