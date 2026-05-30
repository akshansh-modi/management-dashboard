import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Upload, Typography, Image, Space } from 'antd';
import { PlusOutlined, EditOutlined, UploadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { brandService } from '../../services/brandService';
import { uploadService } from '../../services/uploadService';
import type { Brand } from '../../types';

const { Title, Text } = Typography;

export default function BrandManager() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [form] = Form.useForm();
  
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const data = await brandService.getAll();
      setBrands(data);
    } catch (err) {
      message.error('Failed to load brands');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const openModal = (brand?: Brand) => {
    setEditingBrand(brand || null);
    if (brand) {
      form.setFieldsValue(brand);
      if (brand.brandLogoUrl) {
        setFileList([
          {
            uid: '-1',
            name: 'logo.png',
            status: 'done',
            url: brand.brandLogoUrl,
          },
        ]);
      } else {
        setFileList([]);
      }
    } else {
      form.resetFields();
      setFileList([]);
    }
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    form.resetFields();
    setFileList([]);
    setEditingBrand(null);
  };

  const handleSave = async (values: any) => {
    try {
      if (editingBrand?.brandId) {
        await brandService.update({ ...values, brandId: editingBrand.brandId });
        message.success('Brand updated successfully');
      } else {
        await brandService.create(values);
        message.success('Brand created successfully');
      }
      closeModal();
      fetchBrands();
    } catch (err) {
      message.error('Failed to save brand');
    }
  };

  const handleCustomUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;
    setUploading(true);
    try {
      const url = await uploadService.uploadImage(file as File, 'brands');
      form.setFieldValue('brandLogoUrl', url);
      setFileList([
        {
          uid: '-1',
          name: (file as File).name,
          status: 'done',
          url: url,
        },
      ]);
      onSuccess?.('ok');
    } catch (err) {
      message.error('Image upload failed');
      onError?.(err as Error);
    } finally {
      setUploading(false);
    }
  };

  const uploadProps: UploadProps = {
    customRequest: handleCustomUpload,
    fileList,
    onRemove: () => {
      setFileList([]);
      form.setFieldValue('brandLogoUrl', null);
    },
    accept: 'image/*',
    maxCount: 1,
    listType: 'picture',
  };

  const columns: ColumnsType<Brand> = [
    {
      title: 'Logo',
      dataIndex: 'brandLogoUrl',
      key: 'brandLogoUrl',
      render: (url) => url ? <Image src={url} width={40} height={40} style={{ objectFit: 'contain' }} /> : '-',
    },
    {
      title: 'Brand Name',
      dataIndex: 'brandName',
      key: 'brandName',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Website',
      dataIndex: 'brandWebsiteUrl',
      key: 'brandWebsiteUrl',
      render: (text) => text ? <a href={text} target="_blank" rel="noreferrer">Link</a> : '-',
    },
    {
      title: 'Email',
      dataIndex: 'brandContactEmail',
      key: 'brandContactEmail',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openModal(record)}>
            Edit
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }} className="animate-fade-in">
      <div className="page-header-row">
        <div>
          <Title level={3} style={{ margin: 0 }}>Brand Management</Title>
          <Text type="secondary">Manage product brands and logos</Text>
        </div>
        <Button className="page-header-action" type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          Add Brand
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={brands}
        rowKey="brandId"
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 'max-content' }}
        style={{ background: '#fff', borderRadius: 8, padding: 24 }}
      />

      <Modal
        title={editingBrand ? 'Edit Brand' : 'Create Brand'}
        open={isModalVisible}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={uploading}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="brandName" label="Brand Name" rules={[{ required: true, message: 'Please enter a brand name' }]}>
            <Input placeholder="e.g. CRI Pumps" />
          </Form.Item>

          <Form.Item label="Brand Logo">
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />} loading={uploading}>
                Upload Logo
              </Button>
            </Upload>
          </Form.Item>
          {/* Hidden field to store the URL from upload */}
          <Form.Item name="brandLogoUrl" hidden>
            <Input />
          </Form.Item>

          <Form.Item name="brandWebsiteUrl" label="Website URL">
            <Input placeholder="https://..." />
          </Form.Item>

          <Form.Item name="brandContactEmail" label="Contact Email">
            <Input placeholder="contact@brand.com" />
          </Form.Item>

          <Form.Item name="brandContactPhone" label="Contact Phone">
            <Input placeholder="+91..." />
          </Form.Item>

          <Form.Item name="brandDescription" label="Description">
            <Input.TextArea rows={3} placeholder="Brief description of the brand..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
