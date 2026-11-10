import type { ReactNode } from 'react';
import { StateBlock } from '@/components/ui/StateBlock';

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Ảnh/icon tuỳ chọn; mặc định dùng hình sổ trống của thiết kế. */
  image?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}

/** Trạng thái rỗng dùng chung — nội dung tiếng Việt, không lorem ipsum. */
export function EmptyState({ title, description, image, action, compact = false }: EmptyStateProps) {
  if (image) {
    return (
      <div style={{ textAlign: 'center', padding: compact ? 16 : 32 }}>
        {image}
        <h2 style={{ font: '600 var(--fs-16)/1.3 var(--font-display)', margin: '8px 0 4px' }}>{title}</h2>
        {description && <p style={{ color: 'var(--ink-3)', margin: '0 0 12px' }}>{description}</p>}
        {action}
      </div>
    );
  }
  return <StateBlock kind="empty" title={title} description={description} action={action} compact={compact} />;
}
