import { CommentOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './shell.module.css';

interface PageHeadProps {
  title: string;
  /** Dữ kiện nối bằng " · "; phần rỗng bị bỏ. */
  facts?: Array<string | null | undefined | false>;
  /** Nút phụ/primary (tối đa 1 primary, đứng cuối). */
  actions?: ReactNode;
  /** "Hỏi AI" luôn đứng đầu cụm; bỏ khi vai trò không có AI. */
  onAskAi?: () => void;
  /** Nhãn nút trợ lý; mặc định "Hỏi AI". */
  askLabel?: string;
  /** Đường dẫn quay lại (UX-10): mục cuối là trang hiện tại, không có `to`. */
  crumbs?: Array<{ label: string; to?: string }>;
}

export function PageHead({ title, facts = [], actions, onAskAi, askLabel = 'Hỏi AI', crumbs }: PageHeadProps) {
  const text = facts.filter(Boolean).join(' · ');
  return (
    <>
    {crumbs && crumbs.length > 0 && (
      <nav aria-label="Vị trí" className={styles.crumbs} data-testid="breadcrumb">
        {crumbs.map((c, i) => (
          <span key={c.label}>
            {i > 0 && <span aria-hidden> / </span>}
            {c.to ? <Link to={c.to}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
          </span>
        ))}
      </nav>
    )}
    <header className={styles.pageHead}>
      <div className={styles.pageTitleBox}>
        <Typography.Title level={1} className={styles.pageTitle}>
          {title}
        </Typography.Title>
        <span className={styles.pageMeta}>{text}</span>
      </div>
      <div className={styles.pageActions}>
        {onAskAi && (
          <Button icon={<CommentOutlined />} onClick={onAskAi}>
            {askLabel}
          </Button>
        )}
        {actions}
      </div>
    </header>
    </>
  );
}
