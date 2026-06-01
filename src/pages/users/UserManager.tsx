import { useState, useEffect, useCallback } from 'react';
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
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { userService } from '../../services/userService';
import { toUserMessage } from '../../utils/errorHandling';
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

export default function UserManager() {
  const { message } = App.useApp();
  const navigate = useNavigate();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userService.list({
        role: roleFilter === 'ALL' ? undefined : roleFilter,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
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
  }, [page, pageSize, roleFilter, statusFilter, message]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: Role) => {
    try {
      await userService.changeRole(userId, newRole);
      message.success(`User role updated to ${newRole}`);
      fetchUsers();
    } catch (err) {
      message.error(toUserMessage(err));
    }
  };

  const handleApproval = async (userId: string, status: 'APPROVED' | 'REJECTED') => {
    setApprovalLoading(userId + status);
    try {
      await userService.changeAccountStatus(userId, status);
      message.success(`Account ${status === 'APPROVED' ? 'approved' : 'rejected'} successfully.`);
      fetchUsers();
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

  const filteredUsers = users.filter((user) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (user.username || '').toLowerCase().includes(q) ||
      (user.companyName || '').toLowerCase().includes(q) ||
      (user.mobileNumber || '').toLowerCase().includes(q) ||
      (user.emailId || '').toLowerCase().includes(q)
    );
  });

  const pendingCount = users.filter(
    (u) => u.accountStatus === 'PENDING_APPROVAL'
  ).length;

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
      title: 'Role',
      key: 'role',
      render: (_, u) => (
        <Space wrap>
          <Tag color={ROLE_COLORS[u.role] ?? 'default'} style={{ textTransform: 'capitalize' }}>
            {u.role}
          </Tag>
          <Select
            size="small"
            value={u.role}
            style={{ width: 100 }}
            onChange={(val: Role) => {
              Modal.confirm({
                title: `Change role of ${u.companyName || u.username}?`,
                content: `This will update the user's role to "${val}".`,
                okText: 'Yes, Change',
                cancelText: 'Cancel',
                onOk: () => handleRoleChange(u.userId, val),
              });
            }}
          >
            <Option value="buyer">Buyer</Option>
            <Option value="seller">Seller</Option>
            <Option value="admin">Admin</Option>
          </Select>
        </Space>
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
    <div className="animate-fade-in" style={{ padding: 24 }}>
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

      <div className="chart-card" style={{ padding: 16, background: '#fff', borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, gap: 16, flexWrap: 'wrap' }}>
          <Input
            allowClear
            prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
            placeholder="Search by name, company, phone, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
            <Text type="secondary">Status:</Text>
            <Select
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setPage(0); }}
              style={{ width: 170 }}
            >
              <Option value="ALL">All Statuses</Option>
              <Option value="PENDING_APPROVAL">Pending Approval</Option>
              <Option value="APPROVED">Approved</Option>
              <Option value="REJECTED">Rejected</Option>
            </Select>
          </Space>
        </div>

        <Table<AdminUser>
          rowKey="userId"
          loading={loading}
          columns={columns}
          dataSource={filteredUsers}
          scroll={{ x: 'max-content' }}
          rowClassName={(u) => u.accountStatus === 'PENDING_APPROVAL' ? 'ant-table-row-warning' : ''}
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
