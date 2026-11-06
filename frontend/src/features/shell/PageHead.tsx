import { ThunderboltOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';
import type { ReactNode } from 'react';
import styles from './shell.module.css';

interface PageHeadProps {
  title: string;
  /** Dữ kiện nối bằng " · "; phần rỗng bị bỏ. */
  facts?: Array<string | null | undefined | false>;
  /** Nút phụ/primary (tối đa 1 primary, đứng cuối). */
  actions?: ReactNode;
  /** "Hỏi AI" luôn đứng đầu cụm; bỏ khi vai trò không có AI. */
  onAskAi?: () => void;
}

export function PageHead({ title, facts = [], actions, onAskAi }: PageHeadProps) {
  const text = facts.filter(Boolean).join(' · ');
  return (
    <header className={styles.pageHead}>
      <Typography.Title level={1} className={styles.pageTitle}>
        {title}
      </Typography.Title>
      <span className={styles.pageMeta}>{text}</span>
      <div className={styles.pageActions}>
        {onAskAi && (
          <Button icon={<ThunderboltOutlined />} onClick={onAskAi}>
            Hỏi AI
          </Button>
        )}
        {actions}
      </div>
    </header>
  );
}
