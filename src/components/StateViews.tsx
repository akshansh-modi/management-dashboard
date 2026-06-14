import { Button, Empty, Alert } from 'antd';
import {
  InboxOutlined,
  WarningOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

interface EmptyStateProps {
  /**  What entity is empty — shown in the description. e.g. "products", "orders" */
  entity?: string;
  /** Override the default "No {entity} found" description */
  description?: string;
  /** Optional action button label — e.g. "Add Product". No button if omitted. */
  actionLabel?: string;
  /** Called when the action button is clicked */
  onAction?: () => void;
  /** Optional extra hint below the description */
  hint?: string;
  style?: React.CSSProperties;
}

interface ErrorStateProps {
  message: string;
  description?: string;
  /** Optional retry callback */
  onRetry?: () => void;
  style?: React.CSSProperties;
}

/**
 * F26: Standardised empty state for list views.
 * Renders a consistent Empty image + message + optional CTA.
 */
export function EmptyState({
  entity,
  description,
  actionLabel,
  onAction,
  hint,
  style,
}: EmptyStateProps) {
  const desc = description ?? (entity ? `No ${entity} found` : 'Nothing here yet');
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '48px 24px',
        ...style,
      }}
    >
      <InboxOutlined style={{ fontSize: 48, color: '#D1D5DB', marginBottom: 16 }} />
      <div style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
        {desc}
      </div>
      {hint && (
        <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16, textAlign: 'center', maxWidth: 360 }}>
          {hint}
        </div>
      )}
      {actionLabel && onAction && (
        <Button type="primary" onClick={onAction} style={{ marginTop: 4 }}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

/**
 * F26: Standardised error state for list views.
 * Shows an alert with optional retry button.
 */
export function ErrorState({ message, description, onRetry, style }: ErrorStateProps) {
  return (
    <Alert
      type="error"
      showIcon
      icon={<WarningOutlined />}
      message={message}
      description={
        <div>
          {description && <div style={{ marginBottom: onRetry ? 8 : 0 }}>{description}</div>}
          {onRetry && (
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={onRetry}
              style={{ marginTop: 4 }}
            >
              Try again
            </Button>
          )}
        </div>
      }
      style={{ borderRadius: 8, ...style }}
    />
  );
}

export { Empty };
