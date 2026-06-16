import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, message, Space, Typography, Tag, Popconfirm, Card, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, MinusCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { discountPolicyService } from '../../services/discountPolicyService';
import type { DiscountPolicy } from '../../types';

const { Title, Text } = Typography;
const { Option } = Select;

export default function DiscountPolicyManager() {
  const [policies, setPolicies] = useState<DiscountPolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<DiscountPolicy | null>(null);
  const [form] = Form.useForm();

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const data = await discountPolicyService.getAll();
      setPolicies(data);
    } catch (err) {
      message.error('Failed to load discount policies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const openModal = (policy?: DiscountPolicy) => {
    setEditingPolicy(policy || null);
    if (policy) {
      form.setFieldsValue({
        ...policy,
        // Ensure tiers is at least an empty array to avoid Form.List errors
        tiers: policy.tiers || [],
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        scope: 'PRODUCT',
        isActive: true,
        tiers: [{ minQuantity: 1, discountPercentage: 5 }],
      });
    }
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    form.resetFields();
    setEditingPolicy(null);
  };

  const handleSave = async (values: any) => {
    try {
      if (editingPolicy?.policyId) {
        await discountPolicyService.update(editingPolicy.policyId, values);
        message.success('Policy updated successfully');
      } else {
        await discountPolicyService.create(values);
        message.success('Policy created successfully');
      }
      closeModal();
      fetchPolicies();
    } catch (err) {
      message.error('Failed to save policy');
    }
  };

  const handleDelete = async (policyId: string) => {
    try {
      await discountPolicyService.delete(policyId);
      message.success('Policy deleted successfully');
      fetchPolicies();
    } catch (err) {
      message.error('Failed to delete policy');
    }
  };

  const columns: ColumnsType<DiscountPolicy> = [
    {
      title: 'Policy ID',
      dataIndex: 'policyId',
      key: 'policyId',
      render: (text) => <Text copyable>{text}</Text>,
    },
    {
      title: 'Scope',
      dataIndex: 'scope',
      key: 'scope',
      render: (scope) => (
        <Tag color={scope === 'CATEGORY' ? 'purple' : scope === 'PRODUCT' ? 'blue' : 'default'}>
          {scope}
        </Tag>
      ),
    },
    {
      title: 'Aggregation Group',
      dataIndex: 'aggregationGroupId',
      key: 'aggregationGroupId',
      render: (text) => text || '-',
    },
    {
      title: 'Tiers',
      key: 'tiers',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          {record.tiers?.map((tier, idx) => (
            <Text key={idx} style={{ fontSize: '13px' }}>
              Buy {tier.minQuantity}+ : {tier.discountPercentage}% off
            </Text>
          ))}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Tag color={isActive ? 'success' : 'error'}>{isActive ? 'Active' : 'Inactive'}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openModal(record)}>
            Edit
          </Button>
          <Popconfirm title="Delete this policy?" onConfirm={() => handleDelete(record.policyId)}>
            <Button type="text" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header-row">
        <div>
          <Title level={3} style={{ margin: 0 }}>Discount Policies</Title>
          <Text type="secondary">Manage dynamic pricing and volume discount tiers</Text>
        </div>
        <Button className="page-header-action" type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          Create Policy
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={policies}
        rowKey="policyId"
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 'max-content' }}
        style={{ background: '#fff', borderRadius: 8, padding: 24 }}
      />

      <Modal
        title={editingPolicy ? 'Edit Discount Policy' : 'Create Discount Policy'}
        open={isModalVisible}
        onCancel={closeModal}
        onOk={() => form.submit()}
        destroyOnClose
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Space size="large" style={{ display: 'flex', width: '100%' }}>
            <Form.Item name="scope" label="Scope" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select>
                <Option value="PRODUCT">Product Level</Option>
                <Option value="CATEGORY">Category Level</Option>
                <Option value="NONE">None</Option>
              </Select>
            </Form.Item>

            <Form.Item name="isActive" label="Active Status" valuePropName="checked">
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>
          </Space>

          <Form.Item 
            name="aggregationGroupId" 
            label="Aggregation Group ID (Optional)"
            tooltip="Products sharing the same group ID will combine their quantities to meet tier thresholds."
          >
            <Input placeholder="e.g. SUMMER_SALE_PUMPS" />
          </Form.Item>

          <Card size="small" title="Pricing Tiers" style={{ marginBottom: 24 }}>
            <Form.List name="tiers">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                      <Form.Item
                        {...restField}
                        name={[name, 'minQuantity']}
                        label="Min. Quantity"
                        rules={[{ required: true, message: 'Required' }]}
                      >
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item>
                      
                      <Form.Item
                        {...restField}
                        name={[name, 'discountPercentage']}
                        label="Discount (%)"
                        rules={[{ required: true, message: 'Required' }]}
                      >
                        <InputNumber min={0} max={100} style={{ width: '100%' }} />
                      </Form.Item>

                      <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} style={{ marginTop: 30 }} />
                    </Space>
                  ))}
                  <Form.Item>
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      Add Pricing Tier
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </Card>
        </Form>
      </Modal>
    </div>
  );
}
