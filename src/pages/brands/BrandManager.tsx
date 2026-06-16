import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Upload, Typography, Space, TreeSelect, Tag, Popconfirm, Row, Col, Grid, Spin } from 'antd';
import { PlusOutlined, EditOutlined, UploadOutlined, StopOutlined, CheckCircleOutlined, CloudUploadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { useNavigate } from 'react-router-dom';
import { brandService } from '../../services/brandService';
import { categoryService } from '../../services/categoryService';
import { uploadService } from '../../services/uploadService';
import { slugify } from '../../utils/stringUtils';
import LazyImage from '../../components/LazyImage';
import type { Brand, Category } from '../../types';

const { Title, Text } = Typography;

export default function BrandManager() {
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [form] = Form.useForm();

  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [bannerFileList, setBannerFileList] = useState<UploadFile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

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

  const fetchCategories = async () => {
    try {
      const data = await categoryService.getTree();
      setCategories(data);
    } catch (err) {
      message.error('Failed to load categories');
    }
  };

  useEffect(() => {
    fetchBrands();
    fetchCategories();
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
      if (brand.brandImageUrl) {
        setBannerFileList([
          {
            uid: '-2',
            name: 'banner.png',
            status: 'done',
            url: brand.brandImageUrl,
          },
        ]);
      } else {
        setBannerFileList([]);
      }
    } else {
      form.resetFields();
      setFileList([]);
      setBannerFileList([]);
    }
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    form.resetFields();
    setFileList([]);
    setBannerFileList([]);
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
      const brandName = form.getFieldValue('brandName');
      if (!brandName?.trim()) {
        message.error('Please enter a Brand Name before uploading a logo.');
        setUploading(false);
        onError?.(new Error('Missing brand name'));
        return;
      }
      const brandSlug = slugify(brandName);
      const url = await uploadService.uploadImage(file as File, `brands/${brandSlug}`);
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

  const handleBannerUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;
    setUploading(true);
    try {
      const brandName = form.getFieldValue('brandName');
      if (!brandName?.trim()) {
        message.error('Please enter a Brand Name before uploading a banner.');
        setUploading(false);
        onError?.(new Error('Missing brand name'));
        return;
      }
      const brandSlug = slugify(brandName);
      const url = await uploadService.uploadImage(file as File, `brands/${brandSlug}/banner`);
      form.setFieldValue('brandImageUrl', url);
      setBannerFileList([
        {
          uid: '-2',
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

  const bannerUploadProps: UploadProps = {
    customRequest: handleBannerUpload,
    fileList: bannerFileList,
    onRemove: () => {
      setBannerFileList([]);
      form.setFieldValue('brandImageUrl', null);
    },
    accept: 'image/*',
    maxCount: 1,
    listType: 'picture',
  };

  const handleToggleStatus = async (brand: Brand) => {
    if (!brand.brandId) return;
    try {
      if (brand.isActive) {
        await brandService.disable(brand.brandId);
        message.success('Brand disabled');
      } else {
        await brandService.enable(brand.brandId);
        message.success('Brand enabled');
      }
      fetchBrands();
    } catch (err) {
      message.error('Failed to update brand status');
    }
  };

  const columns: ColumnsType<Brand> = [
    {
      title: 'Logo',
      dataIndex: 'brandLogoUrl',
      key: 'brandLogoUrl',
      render: (url) => url ? <LazyImage src={url} alt="Brand logo" width={40} height={40} objectFit="contain" preview /> : '-',
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
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean | undefined) =>
        isActive === false
          ? <Tag color="red">Disabled</Tag>
          : <Tag color="green">Active</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openModal(record)}>
            Edit
          </Button>
          <Popconfirm
            title={record.isActive === false ? 'Enable this brand?' : 'Disable this brand?'}
            description={record.isActive === false
              ? 'It will become visible to buyers again.'
              : 'It will be hidden from buyers.'}
            okText={record.isActive === false ? 'Enable' : 'Disable'}
            cancelText="Cancel"
            onConfirm={() => handleToggleStatus(record)}
          >
            {record.isActive === false
              ? <Button type="text" icon={<CheckCircleOutlined />}>Enable</Button>
              : <Button type="text" danger icon={<StopOutlined />}>Disable</Button>}
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header-row">
        <div>
          <Title level={3} style={{ margin: 0 }}>Brand Management</Title>
          <Text type="secondary">Manage product brands and logos</Text>
        </div>
        <Space>
          <Button
            icon={<CloudUploadOutlined />}
            onClick={() => navigate('/bulk-upload')}
          >
            Bulk Upload
          </Button>
          <Button className="page-header-action" type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
            Add Brand
          </Button>
        </Space>
      </div>

      {(screens.md ?? true) ? (
        <Table
          columns={columns}
          dataSource={brands}
          rowKey="brandId"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
          style={{ background: '#fff', borderRadius: 8, padding: 24 }}
        />
      ) : (
        <Spin spinning={loading}>
          {brands.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#9CA3AF' }}>No brands found</div>
          )}
          {brands.map((b) => (
            <div key={b.brandId} style={{ padding: '12px 16px', marginBottom: 8, background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                {b.brandLogoUrl
                  ? <LazyImage src={b.brandLogoUrl} alt={b.brandName} width={40} height={40} objectFit="contain" preview />
                  : <div style={{ width: 40, height: 40, borderRadius: 6, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bfbfbf', fontSize: 18 }}>—</div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text strong style={{ fontSize: 14, display: 'block' }}>{b.brandName}</Text>
                  {b.brandContactEmail && <Text type="secondary" style={{ fontSize: 12 }}>{b.brandContactEmail}</Text>}
                </div>
                <Tag color={b.isActive === false ? 'red' : 'green'}>{b.isActive === false ? 'Disabled' : 'Active'}</Tag>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <Button size="large" type="text" icon={<EditOutlined />} onClick={() => openModal(b)}>Edit</Button>
                <Popconfirm
                  title={b.isActive === false ? 'Enable this brand?' : 'Disable this brand?'}
                  description={b.isActive === false ? 'It will become visible to buyers again.' : 'It will be hidden from buyers.'}
                  okText={b.isActive === false ? 'Enable' : 'Disable'}
                  cancelText="Cancel"
                  onConfirm={() => handleToggleStatus(b)}
                >
                  {b.isActive === false
                    ? <Button size="large" type="text" icon={<CheckCircleOutlined />} style={{ color: '#52C41A' }}>Enable</Button>
                    : <Button size="large" type="text" danger icon={<StopOutlined />}>Disable</Button>}
                </Popconfirm>
              </div>
            </div>
          ))}
        </Spin>
      )}

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

          <Form.Item label="Brand Banner" tooltip="Wide banner image shown on the buyer-facing brand page">
            <Upload {...bannerUploadProps}>
              <Button icon={<UploadOutlined />} loading={uploading}>
                Upload Banner
              </Button>
            </Upload>
          </Form.Item>
          {/* Hidden field to store the banner URL from upload */}
          <Form.Item name="brandImageUrl" hidden>
            <Input />
          </Form.Item>

          <Form.Item name="categoryIds" label="Categories" tooltip="Assign this brand to one or more categories at any level">
            <TreeSelect
              treeData={categories}
              fieldNames={{ label: 'categoryName', value: 'categoryId', children: 'subCategories' }}
              treeCheckable
              showCheckedStrategy={TreeSelect.SHOW_PARENT}
              treeNodeFilterProp="categoryName"
              allowClear
              multiple
              maxTagCount="responsive"
              style={{ width: '100%' }}
              placeholder="Assign to categories (any level)"
            />
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

          <Typography.Text strong style={{ display: 'block', marginBottom: 12 }}>Address</Typography.Text>
          <Form.Item name={['brandAddress', 'addressLine']} label="Address Line">
            <Input placeholder="Street, building, area" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name={['brandAddress', 'city']} label="City">
                <Input placeholder="City" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['brandAddress', 'state']} label="State">
                <Input placeholder="State" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name={['brandAddress', 'pincode']} label="Pincode">
                <Input placeholder="Pincode" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['brandAddress', 'country']} label="Country">
                <Input placeholder="Country" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
