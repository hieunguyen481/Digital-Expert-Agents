import { LockOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import type { ReactNode } from 'react';
import { useId } from 'react';
import styles from './ui.module.css';

export type ActionVariant = 'default' | 'primary' | 'gold' | 'ai' | 'danger';

export interface ActionButtonProps {
  children: ReactNode;
  variant?: ActionVariant;
  icon?: ReactNode;
  loading?: boolean;
  size?: 'small' | 'middle' | 'large';
  onClick?: () => void;
  htmlType?: 'button' | 'submit';
  /** Có lý do thì nút bị khóa: không dùng `disabled`, dùng aria-disabled + aria-describedby (D4). */
  lockedReason?: string;
  disabled?: boolean;
  block?: boolean;
}

/**
 * Nút dùng chung (mockup 21). Nút chốt (`gold`) tối đa một nút mỗi màn hình, ở góc trên phải (D4).
 * Nút khóa luôn kèm lý do hiển thị ngay dưới nút và đọc được bằng trình đọc màn hình.
 */
export function ActionButton({
  children,
  variant = 'default',
  icon,
  loading,
  size,
  onClick,
  htmlType = 'button',
  lockedReason,
  disabled,
  block,
}: ActionButtonProps) {
  const whyId = useId();
  const type = variant === 'primary' ? 'primary' : 'default';
  const className = [variant === 'gold' ? styles.gold : '', variant === 'ai' ? styles.aiBtn : '', lockedReason ? styles.locked : '']
    .filter(Boolean)
    .join(' ');
  const button = (
    <Button
      type={type}
      danger={variant === 'danger'}
      className={className || undefined}
      icon={lockedReason ? <LockOutlined /> : icon}
      loading={loading}
      size={size}
      block={block}
      htmlType={htmlType}
      disabled={disabled && !lockedReason}
      aria-disabled={lockedReason ? true : undefined}
      aria-describedby={lockedReason ? whyId : undefined}
      aria-busy={loading || undefined}
      onClick={lockedReason ? undefined : onClick}
    >
      {children}
    </Button>
  );
  if (!lockedReason) return button;
  return (
    <div className={styles.lockWrap}>
      {button}
      <div className={styles.lockWhy} id={whyId}>
        <LockOutlined aria-hidden />
        <span>{lockedReason}</span>
      </div>
    </div>
  );
}
