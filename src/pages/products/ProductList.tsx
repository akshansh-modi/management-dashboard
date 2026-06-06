import { useCallback, useEffect, useState } from 'react';
import {
  Typography,
  Table,
  Button,
  Tag,
  Space,
  Input,
  Avatar,
  Popconfirm,
  Tooltip,
  App,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  StopOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { productService } from '../../services/productService';
import type { Product } from '../../types';

const { Title, Text } = Typography;

export default function ProductList() {
  const { isAdmin, userId } = useAuth();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0); // 0-based for the API
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce the search box, then query the server (keeps pagination correct).
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res =
        isAdmin || !userId
          ? await productService.listAll(page, pageSize, debouncedSearch || undefined)
          : await productService.listBySeller(userId, page, pageSize, debouncedSearch || undefined);
      setProducts(res.content);
      setTotal(res.totalElements);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      message.error(err?.response?.data?.message || err?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, userId, page, pageSize, debouncedSearch, message]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // "Delete" is a soft-delete: the backend just disables the product (hidden from
  // the catalog, order history preserved). It can be re-enabled below.
  const handleDisable = async (product: Product) => {
    try {
      await productService.remove(product.productId);
      message.success(`Disabled "${product.productName}"`);
      fetchProducts();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      message.error(err?.response?.data?.message || err?.message || 'Could not disable product');
    }
  };

  const handleEnable = async (product: Product) => {
    try {
      await productService.setActive(product, true);
      message.success(`Enabled "${product.productName}"`);
      fetchProducts();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      message.error(err?.response?.data?.message || err?.message || 'Could not enable product');
    }
  };

  const columns: ColumnsType<Product> = [
    {
      title: 'Product',
      dataIndex: 'productName',
      key: 'productName',
      render: (_, p) => (
        <Space>
          <Avatar
            shape="square"
            size={44}
            src={p.productImagesUrl?.[0]}
            icon={<ShoppingOutlined />}
            style={{ background: '#F0F2F5', color: '#9CA3AF' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Text strong style={{ fontSize: 14 }}>{p.productName}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>SKU: {p.sku || '—'}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Brand',
      dataIndex: 'brandName',
      key: 'brandName',
      responsive: ['md'],
      render: (v) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      align: 'right',
      render: (v?: number) =>
        v != null ? <Text strong>₹{Number(v).toLocaleString('en-IN')}</Text> : '—',
    },
    {
      title: 'Stock',
      dataIndex: 'stockQuantity',
      key: 'stockQuantity',
      align: 'right',
      responsive: ['lg'],
      render: (v?: number) => {
        if (v == null) return '—';
        const color = v === 0 ? 'red' : v < 10 ? 'orange' : 'default';
        return <Tag color={color}>{v}</Tag>;
      },
    },
    ...(isAdmin
      ? ([
          {
            title: 'Seller',
            dataIndex: 'sellerId',
            key: 'sellerId',
            responsive: ['lg'],
            render: (v?: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v || '—'}</Text>,
          },
        ] as ColumnsType<Product>)
      : []),
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active?: boolean) =>
        active === false ? <Tag color="default">Inactive</Tag> : <Tag color="green">Active</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, p) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => navigate(`/products/${p.productId}`)}
          />
          {p.isActive === false ? (
            <Tooltip title="Enable — show in catalog again">
              <Button type="text" style={{ color: '#52C41A' }} icon={<CheckCircleOutlined />} onClick={() => handleEnable(p)} />
            </Tooltip>
          ) : (
            <Popconfirm
              title="Disable this product?"
              description="It will be hidden from the catalog and can't be ordered. You can re-enable it anytime — it is not deleted."
              okText="Disable"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDisable(p)}
            >
              <Tooltip title="Disable (soft delete)">
                <Button type="text" danger icon={<StopOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <div
        className="page-header page-header-row"
      >
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>Products</Title>
          <Text type="secondary">
            {isAdmin ? 'Manage the full product catalog' : 'Manage your product catalog'}
          </Text>
        </div>
        <Button className="page-header-action" type="primary" icon={<PlusOutlined />} onClick={() => navigate('/products/new')}>
          Add Product
        </Button>
      </div>

      <div className="chart-card" style={{ padding: 16 }}>
        <Input
          allowClear
          prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
          placeholder="Search by name or SKU"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 360, marginBottom: 16 }}
        />
        <Table<Product>
          rowKey="productId"
          loading={loading}
          columns={columns}
          dataSource={products}
          scroll={{ x: 'max-content' }}
          pagination={{
            current: page + 1,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `${t} products`,
            onChange: (p, ps) => {
              setPage(p - 1);
              setPageSize(ps);
            },
          }}
        />
      </div>
    </div>
  );
}
