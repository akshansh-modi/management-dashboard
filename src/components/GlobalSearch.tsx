import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Input,
  List,
  Tag,
  Typography,
  Spin,
  Empty,
  Divider,
} from 'antd';
import {
  SearchOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { orderService } from '../services/orderService';
import { productService } from '../services/productService';
import { userService } from '../services/userService';
import { useAuth } from '../context/AuthContext';

const { Text } = Typography;

interface SearchResult {
  type: 'order' | 'product' | 'user';
  id: string;
  title: string;
  subtitle?: string;
  tag?: string;
  tagColor?: string;
  path: string;
}

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

const DEBOUNCE_MS = 300;

export default function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed || trimmed.length < 2) {
        setResults([]);
        setSearched(false);
        return;
      }
      setLoading(true);
      setSearched(true);
      const found: SearchResult[] = [];

      // Search orders — server-side via q param
      try {
        const ordRes = isAdmin
          ? await orderService.listAll({ q: trimmed, page: 0, size: 5 })
          : await orderService.listForSeller({ page: 0, size: 20 });
        const ql = trimmed.toLowerCase();
        (isAdmin ? ordRes.content : ordRes.content.filter(
          (o) => o.orderId.toLowerCase().includes(ql) || (o.buyerCompanyName ?? '').toLowerCase().includes(ql)
        ).slice(0, 5)).forEach((o) =>
          found.push({
            type: 'order',
            id: o.orderId,
            title: o.orderId,
            subtitle: o.buyerCompanyName ?? undefined,
            tag: o.status,
            tagColor: o.status === 'DELIVERED' ? 'green' : o.status === 'PENDING' ? 'gold' : o.status === 'CANCELLED' ? 'red' : 'blue',
            path: `/orders/${o.orderId}`,
          })
        );
      } catch {
        /* non-blocking */
      }

      // Search users (admin only) — server-side
      if (isAdmin) {
        try {
          const userRes = await userService.list({ q: trimmed, size: 5 });
          userRes.content.forEach((u) =>
            found.push({
              type: 'user',
              id: u.userId,
              title: u.companyName || u.username,
              subtitle: u.emailId || u.mobileNumber || undefined,
              tag: u.role,
              tagColor: u.role === 'admin' ? 'blue' : u.role === 'seller' ? 'green' : 'default',
              path: u.role === 'buyer' ? `/users/${u.userId}` : `/users/${u.userId}`,
            })
          );
        } catch {
          /* non-blocking */
        }
      }

      // Search products (name / SKU — server-side search param)
      try {
        const prodRes = await productService.listAll(0, 5, trimmed, true);
        prodRes.content.forEach((p) =>
          found.push({
            type: 'product',
            id: p.productId,
            title: p.productName,
            subtitle: p.sku ? `SKU: ${p.sku}` : undefined,
            tag: p.isActive === false ? 'Inactive' : 'Active',
            tagColor: p.isActive === false ? 'orange' : 'green',
            path: `/products/${p.productId}`,
          })
        );
      } catch {
        /* non-blocking */
      }

      setResults(found);
      setLoading(false);
    },
    [isAdmin]
  );

  useEffect(() => {
    if (!query) {
      setResults([]);
      setSearched(false);
      return;
    }
    const t = setTimeout(() => search(query), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, search]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setSearched(false);
    }
  }, [open]);

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  const typeIcon = (type: SearchResult['type']) => {
    if (type === 'order') return <ShoppingCartOutlined style={{ color: '#2F54EB' }} />;
    if (type === 'product') return <ShoppingOutlined style={{ color: '#52C41A' }} />;
    return <TeamOutlined style={{ color: '#FAAD14' }} />;
  };

  const orders = results.filter((r) => r.type === 'order');
  const products = results.filter((r) => r.type === 'product');
  const customers = results.filter((r) => r.type === 'user');

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={580}
      closable={false}
      style={{ top: 80 }}
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #F0F0F0' }}>
        <Input
          autoFocus
          size="large"
          prefix={<SearchOutlined style={{ color: '#9CA3AF', fontSize: 16 }} />}
          placeholder="Search orders, products, customers… (ESC to close)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          bordered={false}
          style={{ fontSize: 15 }}
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
          suffix={
            loading ? <Spin size="small" /> : (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {query.length > 0 && query.length < 2 ? 'Type at least 2 chars' : ''}
              </Text>
            )
          }
        />
      </div>

      <div style={{ maxHeight: 440, overflowY: 'auto', padding: '8px 0' }}>
        {!searched && !query && (
          <div style={{ padding: '20px 24px' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Search across orders and products. Try an order ID or product name.
            </Text>
            <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['⌘K', 'Ctrl+K'].map((k) => (
                <Tag key={k} style={{ fontFamily: 'monospace', fontSize: 12 }}>{k}</Tag>
              ))}
              <Text type="secondary" style={{ fontSize: 12, alignSelf: 'center' }}>
                to open this search anywhere
              </Text>
            </div>
          </div>
        )}

        {searched && !loading && results.length === 0 && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={`No results for "${query}"`}
            style={{ padding: '32px 0' }}
          />
        )}

        {orders.length > 0 && (
          <>
            <div style={{ padding: '6px 20px 2px', color: '#9CA3AF', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Orders
            </div>
            <List
              dataSource={orders}
              renderItem={(r) => (
                <List.Item
                  key={r.id}
                  style={{ padding: '8px 20px', cursor: 'pointer', transition: 'background 0.15s' }}
                  className="global-search-result-item"
                  onClick={() => handleSelect(r.path)}
                >
                  <List.Item.Meta
                    avatar={typeIcon(r.type)}
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text strong style={{ fontFamily: 'monospace', fontSize: 13 }}>{r.title}</Text>
                        {r.tag && <Tag color={r.tagColor}>{r.tag}</Tag>}
                      </div>
                    }
                    description={r.subtitle ? <Text type="secondary" style={{ fontSize: 12 }}>{r.subtitle}</Text> : null}
                  />
                </List.Item>
              )}
            />
          </>
        )}

        {products.length > 0 && (
          <>
            {orders.length > 0 && <Divider style={{ margin: '4px 0' }} />}
            <div style={{ padding: '6px 20px 2px', color: '#9CA3AF', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Products
            </div>
            <List
              dataSource={products}
              renderItem={(r) => (
                <List.Item
                  key={r.id}
                  style={{ padding: '8px 20px', cursor: 'pointer', transition: 'background 0.15s' }}
                  className="global-search-result-item"
                  onClick={() => handleSelect(r.path)}
                >
                  <List.Item.Meta
                    avatar={typeIcon(r.type)}
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text strong style={{ fontSize: 13 }}>{r.title}</Text>
                        {r.tag && <Tag color={r.tagColor}>{r.tag}</Tag>}
                      </div>
                    }
                    description={r.subtitle ? <Text type="secondary" style={{ fontSize: 12 }}>{r.subtitle}</Text> : null}
                  />
                </List.Item>
              )}
            />
          </>
        )}

        {customers.length > 0 && (
          <>
            {(orders.length > 0 || products.length > 0) && <Divider style={{ margin: '4px 0' }} />}
            <div style={{ padding: '6px 20px 2px', color: '#9CA3AF', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Customers
            </div>
            <List
              dataSource={customers}
              renderItem={(r) => (
                <List.Item
                  key={r.id}
                  style={{ padding: '8px 20px', cursor: 'pointer', transition: 'background 0.15s' }}
                  className="global-search-result-item"
                  onClick={() => handleSelect(r.path)}
                >
                  <List.Item.Meta
                    avatar={typeIcon(r.type)}
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text strong style={{ fontSize: 13 }}>{r.title}</Text>
                        {r.tag && <Tag color={r.tagColor}>{r.tag}</Tag>}
                      </div>
                    }
                    description={r.subtitle ? <Text type="secondary" style={{ fontSize: 12 }}>{r.subtitle}</Text> : null}
                  />
                </List.Item>
              )}
            />
          </>
        )}

        {results.length > 0 && (
          <div style={{ padding: '8px 20px', borderTop: '1px solid #F5F5F5' }}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              Press Enter to open · Esc to close
            </Text>
          </div>
        )}
      </div>
    </Modal>
  );
}
