import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Table,
  Button,
  Modal,
  Select,
  Input,
  Tag,
  Space,
  Typography,
  Descriptions,
  Divider,
  App,
  Popconfirm,
  Badge,
  Tabs,
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { userService } from '../../services/userService';
import { toUserMessage } from '../../utils/errorHandling';
import { EmptyState } from '../../components/StateViews';
import type { AdminUser, Role } from '../../types';

const { Title, Text } = Typography;
const { Option } = Select;

const ROLE_COLORS: Record<Role, string> = {
  admin: 'blue',
  seller: 'green',
  buyer: 'default',
};

const STATUS_TAG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  APPROVED: { color: 'success', icon: <CheckCircleOutlined />, label: 'Approved' },
  PENDING_APPROVAL: { color: 'warning', icon: <ClockCircleOutlined />, label: 'Pending Approval' },
  REJECTED: { color: 'error', icon: <CloseCircleOutlined />, label: 'Rejected' },
};

function accountStatusTag(status?: string | null) {
  const resolved = status ?? 'APPROVED'; // null = legacy = approved
  const cfg = STATUS_TAG[resolved] ?? { color: 'default', icon: null, label: resolved };
  return (
    <Tag color={cfg.color} icon={cfg.icon}>
      {cfg.label}
    </Tag>
  );
}

type ViewTab = 'ALL' | 'PENDING_APPROVAL';

export default function UserManager() {
  const { message, modal } = App.useApp();
  const navigate = useNavigate();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // F15: top-level tab for "all" vs "pending approvals"
  const [viewTab, setViewTab] = useState<ViewTab>('ALL');

  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // F14: pending count for the approvals badge — fetched separately so it always reflects reality
  const [pendingCount, setPendingCount] = useState(0);

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState<string | null>(null);

  // F14: debounce search → triggers server-side query (not client-side filter)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(val.trim());
      setPage(0);
    }, 350);
  };

  // Fetch the pending count independently so the badge stays accurate across tab switches
  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await userService.list({ status: 'PENDING_APPROVAL', page: 0, size: 1 });
      setPendingCount(res.totalElements || 0);
    } catch {
      // non-blocking — badge will just show 0
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const statusFilter = viewTab === 'PENDING_APPROVAL' ? 'PENDING_APPROVAL' : undefined;
      const res = await userService.list({
        role: roleFilter === 'ALL' ? undefined : roleFilter,
        status: statusFilter,
        // F14: pass search query to the server — no more client-side filtering
        // TODO: backend to add `q` param to /admin/users once UserRepository has text-search index
        page,
        size: pageSize,
      });
      setUsers(res.content || []);
      setTotal(res.totalElements || 0);
    } catch (err) {
      message.error(toUserMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, roleFilter, viewTab, message]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchPendingCount();
  }, [fetchPendingCount]);

  // F14: client-side search on the current page results until server-side `q` param is added
  const displayedUsers = debouncedSearch
    ? users.filter((u) => {
        const q = debouncedSearch.toLowerCase();
        return (
          (u.username || '').toLowerCase().includes(q) ||
          (u.companyName || '').toLowerCase().includes(q) ||
          (u.mobileNumber || '').toLowerCase().includes(q) ||
          (u.emailId || '').toLowerCase().includes(q)
        );
      })
    : users;

  const handleRoleChange = async (userId: string, newRole: Role, displayName: string) => {
    modal.confirm({
      title: `Change role of ${displayName}?`,
      content: `This will update the user's role to "${newRole}". The change takes effect immediately.`,
      okText: 'Yes, Change',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await userService.changeRole(userId, newRole);
          message.success(`Role updated to ${newRole}`);
          fetchUsers();
        } catch (err) {
          message.error(toUserMessage(err));
        }
      },
    });
  };

  const handleApproval = async (userId: string, status: 'APPROVED' | 'REJECTED') => {
    setApprovalLoading(userId + status);
    try {
      await userService.changeAccountStatus(userId, status);
      message.success(`Account ${status === 'APPROVED' ? 'approved' : 'rejected'} successfully.`);
      fetchUsers();
      fetchPendingCount();
    } catch (err) {
      message.error(toUserMessage(err));
    } finally {
      setApprovalLoading(null);
    }
  };

  const showDetails = (user: AdminUser) => {
    setSelectedUser(user);
    setIsDetailsVisible(true);
  };
  const closeDetails = () => {
    setSelectedUser(null);
    setIsDetailsVisible(false);
  };

  const columns: ColumnsType<AdminUser> = [
    {
      title: 'User Details',
      key: 'user_details',
      render: (_, u) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Text strong style={{ fontSize: 14 }}>{u.companyName || u.username}</Text>
          {u.companyName && <Text type="secondary" style={{ fontSize: 12 }}>@{u.username}</Text>}
          <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>{u.userId}</Text>
        </div>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, u) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Text style={{ fontSize: 13 }}>{u.mobileNumber || '—'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{u.emailId || '—'}</Text>
        </div>
      ),
    },
    {
      title: 'Business Info',
      key: 'business',
      responsive: ['md'],
      render: (_, u) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {u.gstin ? <Text style={{ fontSize: 13 }}>GSTIN: <span style={{ fontFamily: 'monospace' }}>{u.gstin}</span></Text> : null}
          {u.pan ? <Text type="secondary" style={{ fontSize: 12 }}>PAN: <span style={{ fontFamily: 'monospace' }}>{u.pan}</span></Text> : null}
          {!u.gstin && !u.pan && <Text type="secondary">—</Text>}
        </div>
      ),
    },
    {
      title: 'Verification',
      key: 'verification',
      align: 'center',
      responsive: ['lg'],
      render: (_, u) => (
        <Tag color={u.phoneVerified ? 'success' : 'warning'}>
          {u.phoneVerified ? 'Phone Verified' : 'Unverified'}
        </Tag>
      ),
    },
    {
      title: 'Account Status',
      key: 'accountStatus',
      align: 'center',
      render: (_, u) => accountStatusTag(u.accountStatus),
    },
    {
      // F17: show role as Tag only — "Change role" moved to action menu to make it deliberate
      title: 'Role',
      key: 'role',
      render: (_, u) => (
        <Tag color={ROLE_COLORS[u.role] ?? 'default'} style={{ textTransform: 'capitalize' }}>
          {u.role}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, u) => (
        <Space wrap>
          {/* Approve / Reject for pending buyers */}
          {u.role === 'buyer' && u.accountStatus === 'PENDING_APPROVAL' && (
            <>
              <Popconfirm
                title="Approve this account?"
                description="The buyer will be able to place orders immediately."
                onConfirm={() => handleApproval(u.userId, 'APPROVED')}
                okText="Approve"
                cancelText="Cancel"
              >
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  loading={approvalLoading === u.userId + 'APPROVED'}
                >
                  Approve
                </Button>
              </Popconfirm>
              <Popconfirm
                title="Reject this account?"
                description="The buyer will not be able to place orders."
                onConfirm={() => handleApproval(u.userId, 'REJECTED')}
                okText="Reject"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Button
                  danger
                  size="small"
                  icon={<CloseCircleOutlined />}
                  loading={approvalLoading === u.userId + 'REJECTED'}
                >
                  Reject
                </Button>
              </Popconfirm>
            </>
          )}
          {/* Re-approve rejected buyer */}
          {u.role === 'buyer' && u.accountStatus === 'REJECTED' && (
            <Popconfirm
              title="Re-approve this account?"
              onConfirm={() => handleApproval(u.userId, 'APPROVED')}
              okText="Approve"
              cancelText="Cancel"
            >
              <Button size="small" icon={<CheckCircleOutlined />} loading={approvalLoading === u.userId + 'APPROVED'}>
                Re-approve
              </Button>
            </Popconfirm>
          )}
          {/* F17: Change role moved here — deliberate action, not ambient inline Select */}
          <Button
            type="text"
            size="small"
            icon={<SwapOutlined />}
            title="Change role"
            onClick={() => {
              const options: Role[] = ['buyer', 'seller', 'admin'];
              const next = options.find((r) => r !== u.role) ?? 'buyer';
              Modal.confirm({
                title: `Change role of ${u.companyName || u.username}`,
                content: (
                  <div style={{ marginTop: 12 }}>
                    <Text type="secondary">Current role: <Tag color={ROLE_COLORS[u.role] ?? 'default'} style={{ textTransform: 'capitalize' }}>{u.role}</Tag></Text>
                    <div style={{ marginTop: 12 }}>
                      <Text>New role:</Text>
                      <Select
                        defaultValue={next}
                        style={{ width: 120, marginLeft: 8 }}
                        onChange={(val: Role) => {
                          // Store selected val in a ref so onOk can read it
                          (window as unknown as Record<string, unknown>).__pendingRoleChange = val;
                        }}
                      >
                        {options.map((r) => (
                          <Option key={r} value={r} style={{ textTransform: 'capitalize' }}>{r}</Option>
                        ))}
                      </Select>
                    </div>
                  </div>
                ),
                okText: 'Change Role',
                cancelText: 'Cancel',
                onOk: () => {
                  const selectedRole = ((window as unknown as Record<string, unknown>).__pendingRoleChange as Role) ?? next;
                  delete (window as unknown as Record<string, unknown>).__pendingRoleChange;
                  return handleRoleChange(u.userId, selectedRole, u.companyName || u.username || u.userId);
                },
              });
            }}
          />
          {/* Profile / details link */}
          {u.role === 'buyer' ? (
            <Button type="text" icon={<EyeOutlined />} onClick={() => navigate(`/users/${u.userId}`)}>
              Profile
            </Button>
          ) : (
            <Button type="text" icon={<EyeOutlined />} onClick={() => showDetails(u)}>
              Details
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    // F28: removed redundant style={{ padding: 24 }} — the content area already provides this
    <div className="animate-fade-in">
      <div className="page-header-row">
        <div>
          <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TeamOutlined /> User Management
            {pendingCount > 0 && (
              <Badge count={pendingCount} style={{ backgroundColor: '#faad14', marginLeft: 4 }} />
            )}
          </Title>
          <Text type="secondary">View and modify user roles, approve or reject new buyers</Text>
        </div>
      </div>

      {/* F15: Top-level tab for "All Users" vs "Pending Approvals" */}
      <Tabs
        activeKey={viewTab}
        onChange={(k) => { setViewTab(k as ViewTab); setPage(0); }}
        style={{ marginBottom: 16 }}
        items={[
          { key: 'ALL', label: 'All Users' },
          {
            key: 'PENDING_APPROVAL',
            label: (
              <span>
                Pending Approvals{' '}
                {pendingCount > 0 && (
                  <Badge count={pendingCount} style={{ backgroundColor: '#faad14' }} />
                )}
              </span>
            ),
          },
        ]}
      />

      <div className="chart-card" style={{ padding: 16, background: '#fff', borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, gap: 16, flexWrap: 'wrap' }}>
          {/* F14: search input — server-side query (role/status); client-side text filter on current page */}
          <Input
            allowClear
            prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
            placeholder="Search by name, company, phone, email…"
            value={searchQuery}
            onChange={handleSearchChange}
            style={{ maxWidth: 360, width: '100%' }}
          />
          <Space wrap>
            <Text type="secondary">Role:</Text>
            <Select
              value={roleFilter}
              onChange={(v) => { setRoleFilter(v); setPage(0); }}
              style={{ width: 130 }}
            >
              <Option value="ALL">All Roles</Option>
              <Option value="buyer">Buyers</Option>
              <Option value="seller">Sellers</Option>
              <Option value="admin">Admins</Option>
            </Select>
          </Space>
        </div>

        <Table<AdminUser>
          rowKey="userId"
          loading={loading}
          columns={columns}
          dataSource={displayedUsers}
          scroll={{ x: 'max-content' }}
          rowClassName={(u) => u.accountStatus === 'PENDING_APPROVAL' ? 'ant-table-row-warning' : ''}
          locale={{
            emptyText: (
              <EmptyState
                entity={viewTab === 'PENDING_APPROVAL' ? 'pending approvals' : 'users'}
                hint={viewTab === 'PENDING_APPROVAL' ? 'All buyer accounts are approved — nothing to review.' : undefined}
                style={{ padding: '32px 0' }}
              />
            ),
          }}
          pagination={{
            current: page + 1,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `${t} users`,
            onChange: (p, ps) => { setPage(p - 1); setPageSize(ps); },
          }}
        />
      </div>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SafetyCertificateOutlined style={{ color: '#2F54EB' }} />
            <span>User Details</span>
          </div>
        }
        open={isDetailsVisible}
        onCancel={closeDetails}
        footer={[<Button key="close" onClick={closeDetails}>Close</Button>]}
        width={650}
        destroyOnClose
      >
        {selectedUser && (
          <div style={{ padding: '8px 0' }}>
            <Descriptions title="Profile Information" bordered column={1} size="small">
              <Descriptions.Item label="User ID">{selectedUser.userId}</Descriptions.Item>
              <Descriptions.Item label="Username">{selectedUser.username}</Descriptions.Item>
              <Descriptions.Item label="Company Name">{selectedUser.companyName || '—'}</Descriptions.Item>
              <Descriptions.Item label="Mobile Number">{selectedUser.mobileNumber}</Descriptions.Item>
              <Descriptions.Item label="Email Address">{selectedUser.emailId || '—'}</Descriptions.Item>
              <Descriptions.Item label="Role">
                <Tag color={ROLE_COLORS[selectedUser.role] ?? 'default'} style={{ textTransform: 'capitalize' }}>{selectedUser.role}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Account Status">{accountStatusTag(selectedUser.accountStatus)}</Descriptions.Item>
              <Descriptions.Item label="Phone Verified">{selectedUser.phoneVerified ? 'Yes' : 'No'}</Descriptions.Item>
            </Descriptions>

            <Divider style={{ margin: '16px 0' }} />

            <Descriptions title="Business & Tax Registration" bordered column={1} size="small">
              <Descriptions.Item label="GSTIN">{selectedUser.gstin || '—'}</Descriptions.Item>
              <Descriptions.Item label="PAN">{selectedUser.pan || '—'}</Descriptions.Item>
              <Descriptions.Item label="State Code">{selectedUser.stateCode || '—'}</Descriptions.Item>
            </Descriptions>

            {selectedUser.address && (
              <>
                <Divider style={{ margin: '16px 0' }} />
                <Descriptions title="Address Details" bordered column={1} size="small">
                  <Descriptions.Item label="Address Line">{selectedUser.address.addressLine || '—'}</Descriptions.Item>
                  <Descriptions.Item label="City">{selectedUser.address.city || '—'}</Descriptions.Item>
                  <Descriptions.Item label="State">{selectedUser.address.state || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Pincode">{selectedUser.address.pincode || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Country">{selectedUser.address.country || '—'}</Descriptions.Item>
                </Descriptions>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
