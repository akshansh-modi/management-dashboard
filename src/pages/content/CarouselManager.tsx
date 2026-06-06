import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Space, Typography, Upload, Popconfirm, Card, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, MinusCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps, UploadFile } from 'antd/es/upload/interface';
import { carouselService } from '../../services/carouselService';
import { uploadService } from '../../services/uploadService';
import LazyImage from '../../components/LazyImage';
import type { Carousel } from '../../types';

const { Title, Text } = Typography;

export default function CarouselManager() {
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCarousel, setEditingCarousel] = useState<Carousel | null>(null);
  const [form] = Form.useForm();
  
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const fetchCarousels = async () => {
    setLoading(true);
    try {
      const data = await carouselService.getAll();
      setCarousels(data);
    } catch (err) {
      message.error('Failed to load carousels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCarousels();
  }, []);

  const openModal = (carousel?: Carousel) => {
    setEditingCarousel(carousel || null);
    if (carousel) {
      form.setFieldsValue({
        ...carousel,
        items: carousel.items || [],
      });
      if (carousel.imageUrl) {
        setFileList([{ uid: '-1', name: 'banner.png', status: 'done', url: carousel.imageUrl }]);
      } else {
        setFileList([]);
      }
    } else {
      form.resetFields();
      form.setFieldsValue({ isEnabled: true, items: [] });
      setFileList([]);
    }
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    form.resetFields();
    setFileList([]);
    setEditingCarousel(null);
  };

  const handleSave = async (values: any) => {
    try {
      if (editingCarousel?.carouselId) {
        await carouselService.update(editingCarousel.carouselId, values);
        message.success('Carousel updated successfully');
      } else {
        await carouselService.create(values);
        message.success('Carousel created successfully');
      }
      closeModal();
      fetchCarousels();
    } catch (err) {
      message.error('Failed to save carousel');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await carouselService.delete(id);
      message.success('Carousel deleted successfully');
      fetchCarousels();
    } catch (err) {
      message.error('Failed to delete carousel');
    }
  };

  const handleCustomUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;
    setUploading(true);
    try {
      const url = await uploadService.uploadImage(file as File, 'carousels');
      form.setFieldValue('imageUrl', url);
      setFileList([{ uid: '-1', name: (file as File).name, status: 'done', url }]);
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
      form.setFieldValue('imageUrl', null);
    },
    accept: 'image/*',
    maxCount: 1,
    listType: 'picture',
  };

  const columns: ColumnsType<Carousel> = [
    {
      title: 'Image',
      dataIndex: 'imageUrl',
      key: 'imageUrl',
      render: (url) => url ? <LazyImage src={url} alt="Banner" width={60} height={40} objectFit="contain" /> : '-',
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Tagline',
      dataIndex: 'tagline',
      key: 'tagline',
    },
    {
      title: 'Status',
      dataIndex: 'isEnabled',
      key: 'isEnabled',
      render: (enabled) => (
        <Switch checked={enabled} disabled />
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
          <Popconfirm title="Delete carousel?" onConfirm={() => handleDelete(record.carouselId!)}>
            <Button type="text" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }} className="animate-fade-in">
      <div className="page-header-row">
        <div>
          <Title level={3} style={{ margin: 0 }}>Carousel Management</Title>
          <Text type="secondary">Manage promotional banners and call-to-action buttons</Text>
        </div>
        <Button className="page-header-action" type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          Add Carousel
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={carousels}
        rowKey="carouselId"
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 'max-content' }}
        style={{ background: '#fff', borderRadius: 8, padding: 24 }}
      />

      <Modal
        title={editingCarousel ? 'Edit Carousel' : 'Create Carousel'}
        open={isModalVisible}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={uploading}
        destroyOnClose
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Please enter a title' }]}>
            <Input placeholder="e.g. Summer Sale 2026" />
          </Form.Item>

          <Form.Item name="tagline" label="Tagline">
            <Input placeholder="e.g. Up to 50% off on all pumps" />
          </Form.Item>

          <Form.Item label="Banner Image">
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />} loading={uploading}>
                Upload Image
              </Button>
            </Upload>
          </Form.Item>
          <Form.Item name="imageUrl" hidden><Input /></Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item name="isEnabled" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Card size="small" title="Action Buttons (Links)" style={{ marginTop: 24 }}>
            <Form.List name="items">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                      <Form.Item
                        {...restField}
                        name={[name, 'label']}
                        rules={[{ required: true, message: 'Missing button label' }]}
                      >
                        <Input placeholder="Button Text (e.g. Shop Now)" />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'actionLink']}
                        rules={[{ required: true, message: 'Missing link' }]}
                      >
                        <Input placeholder="URL or Route (e.g. /category/pumps)" />
                      </Form.Item>
                      <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} />
                    </Space>
                  ))}
                  <Form.Item style={{ marginBottom: 0 }}>
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      Add Action Button
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
