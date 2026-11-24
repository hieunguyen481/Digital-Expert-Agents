import type { ReactNode } from 'react';
import styles from './ui.module.css';

export type StateKind = 'empty' | 'error' | 'forbidden' | 'notfound';

const STROKE = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

function Illustration({ kind }: { kind: StateKind }) {
  return (
    <svg className={styles.stateIll} viewBox="0 0 132 96" aria-hidden role="presentation" style={{ color: kind === 'error' ? 'var(--warn-700)' : 'var(--brand-700)' }}>
      <rect x="14" y="70" width="104" height="2" fill="var(--rule-strong)" stroke="none" />
      {kind === 'forbidden' && (
        <g {...STROKE}>
          <path d="M66 10 100 22v24c0 18-14 30-34 38C46 76 32 64 32 46V22z" fill="var(--surface)" />
          <rect x="54" y="42" width="24" height="18" rx="2" />
          <path d="M58 42v-6a8 8 0 0 1 16 0v6" />
        </g>
      )}
      {kind === 'empty' && (
        <g {...STROKE}>
          <rect x="30" y="20" width="72" height="50" rx="3" fill="var(--surface)" />
          <path d="M30 34h72M46 20v50" />
          <path d="M56 46h34M56 56h22" stroke="var(--rule-strong)" />
        </g>
      )}
      {kind === 'error' && (
        <g {...STROKE}>
          <path d="M66 14 104 68H28z" fill="var(--surface)" />
          <path d="M66 36v18M66 60v.5" />
        </g>
      )}
      {kind === 'notfound' && (
        <g {...STROKE}>
          <circle cx="60" cy="42" r="22" fill="var(--surface)" />
          <path d="m76 58 22 16" strokeWidth={3} />
          <path d="M52 36h16M52 46h10" stroke="var(--rule-strong)" />
        </g>
      )}
    </svg>
  );
}

export interface StateBlockProps {
  kind: StateKind;
  title: string;
  description?: ReactNode;
  /** Đúng một nút hành động (D3). */
  action?: ReactNode;
  /** Mã trạng thái cỡ lớn (404) đặt trên tiêu đề. */
  code?: string;
  compact?: boolean;
  /** Dùng role="alert" cho lỗi và 403. */
  alert?: boolean;
  /** Bậc tiêu đề: h1 khi khối là nội dung chính của cả trang (404, 403). Mặc định h2. */
  headingLevel?: 1 | 2;
}

/** Trạng thái rỗng / lỗi / 403 (khiên) / 404: một hình, một tiêu đề, một câu giải thích, tối đa một nút. */
export function StateBlock({ kind, title, description, action, code, compact, alert, headingLevel = 2 }: StateBlockProps) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  return (
    <div className={styles.state} role={alert ? 'alert' : undefined} style={compact ? { padding: 'var(--s6) var(--s4)' } : undefined}>
      {!compact && <Illustration kind={kind} />}
      {code && <div className={styles.stateCode}>{code}</div>}
      <Heading>{title}</Heading>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
