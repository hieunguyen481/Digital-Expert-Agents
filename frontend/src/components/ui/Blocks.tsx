import type { ReactNode } from 'react';
import styles from './ui.module.css';

/** Khối do AI sinh: thẻ trắng (viền mờ + bóng nhẹ), dòng nhãn nhỏ màu xám than "AI đề xuất" trên tiêu đề. Chưa phải quyết định. */
export function AiBlock({ title, children, tag = 'AI đề xuất', actions }: { title: ReactNode; children: ReactNode; tag?: string; actions?: ReactNode }) {
  return (
    <section className={styles.aib}>
      <div className={styles.aibHead}>
        <span className={styles.blockTitle}>
          <span className={styles.eyebrowAi}>{tag}</span>
          <span>{title}</span>
        </span>
        {actions && <span className={styles.blockAct}>{actions}</span>}
      </div>
      <div className={styles.blockBody}>{children}</div>
    </section>
  );
}

/** Khối của người: cùng kiểu thẻ, dòng nhãn nhỏ màu xanh dầu ("Người quyết định", "Chỉ đọc"…) trên tiêu đề. */
export function HumanBlock({ title, children, tag = 'Người quyết định', actions }: { title: ReactNode; children: ReactNode; tag?: string | null; actions?: ReactNode }) {
  return (
    <section className={styles.hmb}>
      <div className={styles.hmbHead}>
        <span className={styles.blockTitle}>
          {tag && <span className={styles.eyebrowHm}>{tag}</span>}
          <span>{title}</span>
        </span>
        {actions && <span className={styles.blockAct}>{actions}</span>}
      </div>
      <div className={styles.blockBody}>{children}</div>
    </section>
  );
}
