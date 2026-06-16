import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Typography,
  Table,
  Button,
  Tag,
  Space,
  Input,
  Popconfirm,
  Tooltip,
  App,
  Tabs,
  Select,
  Switch,
  Grid,
  Pagination,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  StopOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  ShoppingOutlined,
  CloudUploadOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import LazyImage from '../../components/LazyImage';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { productService } from '../../services/productService';
import { userService } from '../../services/userService';
import type { Product, Brand, Category } from '../../types';

const { Title, Text } = Typography;

export default function ProductList() {
  const { isAdmin, userId } = useAuth();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0); // 0-based for the API
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'published' | 'inactive'>('published');

  // F21: seller name lookup
  const [sellerMap, setSellerMap] = useState<Record<string, string>>({});
  const sellerMapFetched = useRef(false);

  // F20: brand + category filter options (fetched once on mount)
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brandFilter, setBrandFilter] = useState<string | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);

  // F18: low-stock filter toggle
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const LOW_STOCK_THRESHOLD = 10;

  useEffect(() => {
    if (!isAdmin || sellerMapFetched.current) return;
    sellerMapFetched.current = true;
    userService.listSellers().then((sellers) => {
      const map: Record<string, string> = {};
      sellers.forEach((s) => { if (s.userId) map[s.userId] = s.companyName || s.username || s.userId; });
      setSellerMap(map);
    }).catch(() => { /* non-blocking */ });

    // F20: fetch brand + category options once
    productService.listBrands().then(setBrands).catch(() => {});
    productService.listCategories().then(setCategories).catch(() => {});
  }, [isAdmin]);

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
      const isActiveFilter = activeTab === 'published';
      const res =
        isAdmin || !userId
          ? await productService.listAll(page, pageSize, debouncedSearch || undefined, true, isActiveFilter)
          : await productService.listBySeller(userId, page, pageSize, debouncedSearch || undefined, isActiveFilter);
      setProducts(res.content);
      setTotal(res.totalElements);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      message.error(err?.response?.data?.message || err?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, userId, page, pageSize, debouncedSearch, activeTab, message]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // F18 + F20: client-side filter on the current page
  const displayedProducts = products.filter((p) => {
    if (lowStockOnly && (p.stockQuantity ?? 0) > LOW_STOCK_THRESHOLD) return false;
    if (brandFilter && p.productBrandId !== brandFilter) return false;
    if (categoryFilter && p.categoryId !== categoryFilter) return false;
    return true;
  });

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
          <LazyImage
            src={p.productImagesUrl?.[0]}
            alt={p.productName}
            width={44}
            height={44}
            shape="square"
            fallbackIcon={<ShoppingOutlined />}
            objectFit="cover"
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
            // F21: show company name; raw ID on hover
            render: (v?: string) => {
              if (!v) return <Text type="secondary">—</Text>;
              const name = sellerMap[v];
              return name ? (
                <Tooltip title={`ID: ${v}`}>
                  <Text style={{ fontSize: 12 }}>{name}</Text>
                </Tooltip>
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text>
              );
            },
          },
        ] as ColumnsType<Product>)
      : []),
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      // F19: "Draft" was misleading — these are disabled/inactive products, not unpublished drafts
      render: (active?: boolean) =>
        active === false ? <Tag color="orange">Inactive</Tag> : <Tag color="green">Active</Tag>,
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
            title="Edit product"
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
        <Space>
          <Button
            icon={<CloudUploadOutlined />}
            onClick={() => navigate('/bulk-upload')}
          >
            Bulk Upload
          </Button>
          <Button className="page-header-action" type="primary" icon={<PlusOutlined />} onClick={() => navigate('/products/new')}>
            Add Product
          </Button>
        </Space>
      </div>

      <div className="chart-card" style={{ padding: 16 }}>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key as 'published' | 'inactive');
            setPage(0);
          }}
          items={[
            { key: 'published', label: 'Published / Active' },
            { key: 'inactive', label: 'Inactive / Disabled' },
          ]}
          style={{ marginBottom: 16 }}
        />

        {/* Search + filters toolbar */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
          <Input
            allowClear
            prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
            placeholder="Search by name or SKU"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 280, flex: '1 1 200px' }}
          />

          {/* F20: Brand filter */}
          {brands.length > 0 && (
            <Select
              allowClear
              placeholder="All Brands"
              value={brandFilter}
              onChange={(v) => { setBrandFilter(v); setPage(0); }}
              style={{ minWidth: 140 }}
              options={brands.filter((b) => b.brandId).map((b) => ({ value: b.brandId!, label: b.brandName }))}
            />
          )}

          {/* F20: Category filter */}
          {categories.length > 0 && (
            <Select
              allowClear
              placeholder="All Categories"
              value={categoryFilter}
              onChange={(v) => { setCategoryFilter(v); setPage(0); }}
              style={{ minWidth: 160 }}
              options={categories.map((c) => ({ value: c.categoryId, label: c.categoryName }))}
            />
          )}

          {/* F18: Low-stock toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            <WarningOutlined style={{ color: lowStockOnly ? '#FAAD14' : '#D1D5DB' }} />
            <span style={{ fontSize: 13, color: '#6B7280' }}>Low stock only</span>
            <Switch
              size="small"
              checked={lowStockOnly}
              onChange={(v) => { setLowStockOnly(v); setPage(0); }}
            />
          </div>
        </div>

        {(screens.md ?? true) ? (
          <Table<Product>
            rowKey="productId"
            loading={loading}
            columns={columns}
            dataSource={displayedProducts}
            scroll={{ x: 'max-content' }}
            rowClassName={(p) =>
              (p.stockQuantity ?? Infinity) <= LOW_STOCK_THRESHOLD ? 'low-stock-row' : ''
            }
            pagination={{
              current: page + 1,
              pageSize,
              total,
              showSizeChanger: true,
              showTotal: (t) => `${t} products`,
              onChange: (p, ps) => { setPage(p - 1); setPageSize(ps); },
            }}
          />
        ) : (
          <Spin spinning={loading}>
            {displayedProducts.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#9CA3AF' }}>No products found</div>
            )}
            {displayedProducts.map((p) => (
              <div
                key={p.productId}
                style={{
                  padding: '12px 16px', marginBottom: 8, background: '#fff', borderRadius: 8,
                  border: `1px solid ${(p.stockQuantity ?? Infinity) <= LOW_STOCK_THRESHOLD ? '#faad14' : '#f0f0f0'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div style={{ flex: 1, marginRight: 8 }}>
                    <Text strong style={{ fontSize: 14 }}>{p.productName}</Text>
                    {p.sku && <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>SKU: {p.sku}</Text>}
                  </div>
                  <Tag color={p.isActive === false ? 'orange' : 'green'}>{p.isActive === false ? 'Inactive' : 'Active'}</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <Text strong>{p.price != null ? `₹${Number(p.price).toLocaleString('en-IN')}` : '—'}</Text>
                  <Space>
                    <Button type="text" icon={<EditOutlined />} style={{ minHeight: 44 }} title="Edit product" onClick={() => navigate(`/products/${p.productId}`)} />
                    {p.isActive === false ? (
                      <Tooltip title="Enable — show in catalog again">
                        <Button type="text" style={{ color: '#52C41A', minHeight: 44 }} icon={<CheckCircleOutlined />} onClick={() => handleEnable(p)} />
                      </Tooltip>
                    ) : (
                      <Popconfirm title="Disable this product?" description="Hidden from catalog, can be re-enabled." okText="Disable" okButtonProps={{ danger: true }} onConfirm={() => handleDisable(p)}>
                        <Tooltip title="Disable">
                          <Button type="text" danger style={{ minHeight: 44 }} icon={<StopOutlined />} />
                        </Tooltip>
                      </Popconfirm>
                    )}
                  </Space>
                </div>
              </div>
            ))}
            <Pagination
              current={page + 1} pageSize={pageSize} total={total} simple
              style={{ textAlign: 'center', marginTop: 12 }}
              onChange={(p, ps) => { setPage(p - 1); if (ps) setPageSize(ps); }}
            />
          </Spin>
        )}
      </div>
    </div>
  );
}
