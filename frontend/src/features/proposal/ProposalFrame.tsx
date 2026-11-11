import { CheckCircleFilled, MinusCircleOutlined } from '@ant-design/icons';
import { Menu } from 'antd';
import type { ReactNode } from 'react';
import styles from './proposal.module.css';

export interface FrameStep {
  key: string;
  label: string;
  disabled?: boolean;
}

export interface CheckItem {
  label: string;
  ok: boolean;
  /** Cách xử lý khi chưa đạt. */
  hint?: string;
}

interface Props {
  steps: FrameStep[];
  current: string;
  onSelect?: (key: string) => void;
  checks: CheckItem[];
  children: ReactNode;
  /** Hàng nút cuối khung (nút chính duy nhất nằm ở đây). */
  footer?: ReactNode;
}

/** Khung dùng chung của Tạo đề xuất và Soạn đề xuất: các bước bên trái, nội dung giữa, kiểm tra bên phải (mockup 04, 17). */
export function ProposalFrame({ steps, current, onSelect, checks, children, footer }: Props) {
  const left = checks.filter((c) => !c.ok).length;
  return (
    <div className={styles.ws}>
      <Menu
        mode="inline"
        selectedKeys={[current]}
        items={steps.map((s) => ({ key: s.key, label: s.label, disabled: s.disabled }))}
        onClick={(e) => onSelect?.(e.key)}
        aria-label="Các bước soạn đề xuất"
        className={`${styles.toc} ${styles.steps}`}
      />
      <section className={`${styles.content} ${styles.card}`} aria-label="Nội dung đề xuất">
        {children}
        {footer && <div className={styles.foot}>{footer}</div>}
      </section>
      <aside className={`${styles.card} ${styles.check}`} aria-label="Kiểm tra trước khi gửi">
        <h2>Kiểm tra trước khi gửi</h2>
        <p className={styles.checkSum}>{left === 0 ? 'Các mục bắt buộc ở bước này đã đủ.' : `Còn ${left} mục bắt buộc chưa đủ.`}</p>
        <ul>
          {checks.map((c) => (
            <li key={c.label} data-ok={c.ok ? '' : undefined}>
              {c.ok ? <CheckCircleFilled aria-hidden /> : <MinusCircleOutlined aria-hidden />}
              <span>
                {c.label}
                <span className="sr-only">{c.ok ? ': đã đủ' : ': chưa đủ'}</span>
                {!c.ok && c.hint && <small>{c.hint}</small>}
              </span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
