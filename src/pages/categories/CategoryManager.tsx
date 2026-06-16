import { useState, useEffect } from 'react';
import { Tree, Button, Modal, Form, Input, message, Upload, Typography, Card, Space, Drawer, Table, Tag, Tooltip, Select, Switch, InputNumber, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, UploadOutlined, FilterOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { categoryService } from '../../services/categoryService';
import { uploadService } from '../../services/uploadService';
import { filterService } from '../../services/filterService';
import LazyImage from '../../components/LazyImage';
import type { Category, FilterAttribute, FilterConfig } from '../../types';

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

  // Filter Drawer State
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [filterDrawerCategoryId, setFilterDrawerCategoryId] = useState<string | null>(null);
  const [directFilters, setDirectFilters] = useState<FilterAttribute[]>([]);
  const [inheritedFilters, setInheritedFilters] = useState<FilterConfig[]>([]);
  const [filterFormVisible, setFilterFormVisible] = useState(false);
  const [editingFilter, setEditingFilter] = useState<FilterAttribute | null>(null);
  const [filterForm] = Form.useForm();
  const [filtersLoading, setFiltersLoading] = useState(false);

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

  // Filter Management Logic
  const openFilterDrawer = async (categoryId: string) => {
    setFilterDrawerCategoryId(categoryId);
    setFilterDrawerOpen(true);
    fetchFiltersForCategory(categoryId);
  };

  const fetchFiltersForCategory = async (categoryId: string) => {
    setFiltersLoading(true);
    try {
      const [resolved, allFilters] = await Promise.all([
        filterService.getForCategory(categoryId),
        filterService.getAll(),
      ]);

      const direct = allFilters.filter(f => f.categoryIds.includes(categoryId));
      const directIds = new Set(direct.map(f => f.attributeId));

      const inherited = resolved.filter(f => !directIds.has(f.id));

      setDirectFilters(direct);
      setInheritedFilters(inherited);
    } catch (err) {
      message.error('Failed to load filters');
    } finally {
      setFiltersLoading(false);
    }
  };

  const closeFilterDrawer = () => {
    setFilterDrawerOpen(false);
    setFilterDrawerCategoryId(null);
    setFilterFormVisible(false);
    setEditingFilter(null);
    filterForm.resetFields();
  };

  const handleFilterSave = async (values: any) => {
    if (!filterDrawerCategoryId) return;
    setFiltersLoading(true);
    try {
      if (editingFilter?.mongoId) {
        await filterService.update(editingFilter.mongoId, values);
        message.success('Filter updated successfully');
      } else {
        await filterService.create(values);
        message.success('Filter created successfully');
      }
      setFilterFormVisible(false);
      setEditingFilter(null);
      filterForm.resetFields();
      await fetchFiltersForCategory(filterDrawerCategoryId);
    } catch (e: any) {
      message.error(e?.response?.data?.message || e?.message || 'Failed to save filter');
      setFiltersLoading(false);
    }
  };

  const handleDeleteFilter = async (filter: FilterAttribute) => {
    if (!filterDrawerCategoryId || !filter.mongoId) return;
    
    if (filter.categoryIds.length > 1) {
      Modal.confirm({
        title: 'Delete shared filter?',
        content: `This filter is shared across ${filter.categoryIds.length} categories. Do you want to remove it from this category only, or delete it everywhere?`,
        okText: 'Remove from this category',
        cancelText: 'Delete from all',
        onOk: async () => {
          try {
            await filterService.update(filter.mongoId!, {
              ...filter,
              categoryIds: filter.categoryIds.filter(id => id !== filterDrawerCategoryId)
            });
            message.success('Removed filter from this category');
            fetchFiltersForCategory(filterDrawerCategoryId);
          } catch (e: any) {
            message.error(e?.response?.data?.message || 'Failed to remove filter');
          }
        },
        onCancel: async () => {
          try {
            await filterService.delete(filter.mongoId!);
            message.success('Filter deleted completely');
            fetchFiltersForCategory(filterDrawerCategoryId);
          } catch (e: any) {
            message.error(e?.response?.data?.message || 'Failed to delete filter');
          }
        }
      });
    } else {
      try {
        await filterService.delete(filter.mongoId);
        message.success('Filter deleted successfully');
        fetchFiltersForCategory(filterDrawerCategoryId);
      } catch (e: any) {
        message.error(e?.response?.data?.message || 'Failed to delete filter');
      }
    }
  };

  const openFilterForm = (filter?: FilterAttribute) => {
    setEditingFilter(filter || null);
    if (filter) {
      filterForm.setFieldsValue(filter);
    } else {
      filterForm.resetFields();
      filterForm.setFieldsValue({
        categoryIds: [filterDrawerCategoryId],
        type: 'single-select',
        displayOrder: 0,
        includeSubcategories: false,
      });
    }
    setFilterFormVisible(true);
  };

  const flattenCategoriesForSelect = (cats: Category[]): { label: string; value: string }[] => {
    let result: { label: string; value: string }[] = [];
    cats.forEach(cat => {
      if (cat.categoryId) {
        result.push({ label: cat.categoryName, value: cat.categoryId });
      }
      if (cat.subCategories) {
        result = result.concat(flattenCategoriesForSelect(cat.subCategories));
      }
    });
    return result;
  };

  const flatCategories = flattenCategoriesForSelect(categories);

  const inheritedColumns = [
    { title: 'Label', dataIndex: 'label', key: 'label' },
    { title: 'Attribute ID', dataIndex: 'id', key: 'id' },
    { title: 'Type', dataIndex: 'type', key: 'type' },
    {
      title: 'Inherited',
      key: 'inherited',
      render: () => (
        <Tooltip title="Defined on an ancestor category with includeSubcategories = true">
          <Tag color="default">inherited</Tag>
        </Tooltip>
      ),
    },
  ];

  const directColumns = [
    { title: 'Label', dataIndex: 'label', key: 'label' },
    { title: 'Attribute ID', dataIndex: 'attributeId', key: 'attributeId' },
    { title: 'Type', dataIndex: 'type', key: 'type' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: FilterAttribute) => (
        <Space>
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openFilterForm(record)} />
          <Popconfirm
            title="Delete this filter?"
            onConfirm={() => handleDeleteFilter(record)}
            okText="Yes"
            cancelText="No"
          >
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

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
            <Button size="small" type="text" icon={<FilterOutlined />} onClick={(e) => { e.stopPropagation(); openFilterDrawer(cat.categoryId!); }}>
              Filters
            </Button>
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
    <div className="animate-fade-in">
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

      <Drawer
        title="Category Filters"
        width={600}
        open={filterDrawerOpen}
        onClose={closeFilterDrawer}
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Title level={5} style={{ margin: 0 }}>Inherited Filters</Title>
            </div>
            <Table
              size="small"
              columns={inheritedColumns}
              dataSource={inheritedFilters}
              rowKey="id"
              pagination={false}
              loading={filtersLoading}
              locale={{ emptyText: 'No inherited filters' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Title level={5} style={{ margin: 0 }}>Direct Filters</Title>
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => openFilterForm()}>
                Add Filter
              </Button>
            </div>
            <Table
              size="small"
              columns={directColumns}
              dataSource={directFilters}
              rowKey="mongoId"
              pagination={false}
              loading={filtersLoading}
              locale={{ emptyText: 'No direct filters' }}
            />
          </div>

          {filterFormVisible && (
            <Card title={editingFilter ? 'Edit Filter' : 'Add Filter'} size="small" style={{ background: '#FAFBFC' }}>
              <Form form={filterForm} layout="vertical" onFinish={handleFilterSave}>
                <Form.Item name="categoryIds" label="Categories" rules={[{ required: true, message: 'Select at least one category' }]}>
                  <Select
                    mode="multiple"
                    showSearch
                    optionFilterProp="label"
                    options={[...flatCategories, { label: 'Default (Global)', value: 'default' }]}
                  />
                </Form.Item>
                <Space style={{ display: 'flex' }} align="start">
                  <Form.Item name="attributeId" label="Attribute ID" rules={[{ required: true, message: 'Required' }]}>
                    <Input placeholder="e.g. horsepower" disabled={!!editingFilter} />
                  </Form.Item>
                  <Form.Item name="label" label="Label" rules={[{ required: true, message: 'Required' }]}>
                    <Input placeholder="e.g. Horsepower" />
                  </Form.Item>
                </Space>
                <Space style={{ display: 'flex' }} align="start">
                  <Form.Item name="type" label="Type" rules={[{ required: true, message: 'Required' }]}>
                    <Select options={[
                      { label: 'Single Select', value: 'single-select' },
                      { label: 'Multi Select', value: 'multi-select' },
                      { label: 'Range', value: 'range' }
                    ]} />
                  </Form.Item>
                  <Form.Item name="unit" label="Unit">
                    <Input placeholder="e.g. HP" />
                  </Form.Item>
                  <Form.Item name="displayOrder" label="Display Order">
                    <InputNumber min={0} />
                  </Form.Item>
                </Space>
                <Form.Item noStyle shouldUpdate={(prev, curr) => prev.type !== curr.type}>
                  {({ getFieldValue }) => {
                    const type = getFieldValue('type');
                    if (type === 'range') {
                      return (
                        <Space style={{ display: 'flex' }} align="start">
                          <Form.Item name="min" label="Min Value" rules={[{ required: true, message: 'Required' }]}>
                            <InputNumber />
                          </Form.Item>
                          <Form.Item name="max" label="Max Value" rules={[{ required: true, message: 'Required' }]}>
                            <InputNumber />
                          </Form.Item>
                        </Space>
                      );
                    }
                    if (type === 'single-select' || type === 'multi-select') {
                      return (
                        <Form.Item name="options" label="Options" rules={[{ required: true, message: 'Required' }]}>
                          <Select mode="tags" placeholder="Type an option and press Enter" />
                        </Form.Item>
                      );
                    }
                    return null;
                  }}
                </Form.Item>
                <Form.Item
                  name="includeSubcategories"
                  valuePropName="checked"
                  label="Include Subcategories"
                  tooltip="When enabled, this filter is automatically inherited by all child categories."
                >
                  <Switch />
                </Form.Item>
                <Space>
                  <Button onClick={() => setFilterFormVisible(false)}>Cancel</Button>
                  <Button type="primary" htmlType="submit" loading={filtersLoading}>Save</Button>
                </Space>
              </Form>
            </Card>
          )}
        </div>
      </Drawer>
    </div>
  );
}
