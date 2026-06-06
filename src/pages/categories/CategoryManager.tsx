import { useState, useEffect } from 'react';
import { Tree, Button, Modal, Form, Input, message, Upload, Typography, Card, Space } from 'antd';
import { PlusOutlined, EditOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { categoryService } from '../../services/categoryService';
import { uploadService } from '../../services/uploadService';
import LazyImage from '../../components/LazyImage';
import type { Category } from '../../types';

const { Title, Text } = Typography;

export default function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string | undefined>(undefined);
  
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await categoryService.getTree();
      setCategories(data);
    } catch (err) {
      message.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openModal = (category?: Category, parentId?: string) => {
    setEditingCategory(category || null);
    setSelectedParentId(parentId);
    
    if (category) {
      form.setFieldsValue(category);
      if (category.categoryImageUrl) {
        setFileList([{ uid: '-1', name: 'image.png', status: 'done', url: category.categoryImageUrl }]);
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
    setEditingCategory(null);
    setSelectedParentId(undefined);
  };

  const handleSave = async (values: any) => {
    try {
      const payload = {
        ...values,
        parentCategoryId: selectedParentId,
      };

      if (editingCategory?.categoryId) {
        await categoryService.update({ ...payload, categoryId: editingCategory.categoryId });
        message.success('Category updated successfully');
      } else {
        await categoryService.create(payload);
        message.success('Category created successfully');
      }
      closeModal();
      fetchCategories();
    } catch (err) {
      message.error('Failed to save category');
    }
  };

  const handleCustomUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;
    setUploading(true);
    try {
      const url = await uploadService.uploadImage(file as File, 'categories');
      form.setFieldValue('categoryImageUrl', url);
      setFileList([{ uid: '-1', name: (file as File).name, status: 'done', url: url }]);
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
      form.setFieldValue('categoryImageUrl', null);
    },
    accept: 'image/*',
    maxCount: 1,
    listType: 'picture',
  };

  // Convert nested categories into Ant Design Tree nodes
  const mapCategoriesToTreeNodes = (cats: Category[]): any[] => {
    return cats.map((cat) => ({
      title: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingRight: 24 }}>
          <Space>
            {cat.categoryImageUrl && <LazyImage src={cat.categoryImageUrl} alt={cat.categoryName} width={24} height={24} objectFit="contain" />}
            <Text strong>{cat.categoryName}</Text>
          </Space>
          <Space>
            <Button size="small" type="text" icon={<PlusOutlined />} onClick={(e) => { e.stopPropagation(); openModal(undefined, cat.categoryId); }}>
              Add Sub
            </Button>
            <Button size="small" type="text" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); openModal(cat, cat.parentCategoryId); }} />
          </Space>
        </div>
      ),
      key: cat.categoryId,
      children: cat.subCategories ? mapCategoriesToTreeNodes(cat.subCategories) : [],
    }));
  };

  return (
    <div style={{ padding: 24 }} className="animate-fade-in">
      <div className="page-header-row">
        <div>
          <Title level={3} style={{ margin: 0 }}>Category Hierarchy</Title>
          <Text type="secondary">Manage product taxonomy and structures</Text>
        </div>
        <Button className="page-header-action" type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          Add Root Category
        </Button>
      </div>

      <Card loading={loading} style={{ minHeight: 400 }}>
        {categories.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 600 }}>
              <Tree
                treeData={mapCategoriesToTreeNodes(categories)}
                defaultExpandAll
                blockNode
                selectable={false}
              />
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
            No categories found. Create one to get started.
          </div>
        )}
      </Card>

      <Modal
        title={editingCategory ? 'Edit Category' : (selectedParentId ? 'Create Subcategory' : 'Create Root Category')}
        open={isModalVisible}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={uploading}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="categoryName" label="Category Name" rules={[{ required: true, message: 'Please enter category name' }]}>
            <Input placeholder="e.g. Pumps" />
          </Form.Item>

          <Form.Item label="Category Image">
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />} loading={uploading}>
                Upload Image
              </Button>
            </Upload>
          </Form.Item>
          <Form.Item name="categoryImageUrl" hidden><Input /></Form.Item>

          <Form.Item name="categoryDescription" label="Description">
            <Input.TextArea rows={3} placeholder="Brief description..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
