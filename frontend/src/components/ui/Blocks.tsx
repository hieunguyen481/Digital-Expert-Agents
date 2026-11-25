import type { ReactNode } from 'react';
import { AiTag, HumanTag } from './Indicators';
import styles from './ui.module.css';

/** Khối do AI sinh: thẻ trắng viền liền, đầu thẻ xám nhạt, luôn có nhãn "AI đề xuất". Chưa phải quyết định. */
export function AiBlock({ title, children, tag = 'AI đề xuất', actions }: { title: ReactNode; children: ReactNode; tag?: string; actions?: ReactNode }) {
  return (
    <section className={styles.aib}>
      <div className={styles.aibHead}>
        <AiTag>{tag}</AiTag>
        <span>{title}</span>
        {actions && <span className={styles.blockAct}>{actions}</span>}
      </div>
      <div className={styles.blockBody}>{children}</div>
    </section>
  );
}

/** Khối quyết định của người có thẩm quyền: viền liền, thanh brand bên trái, nhãn "Người quyết định". */
export function HumanBlock({ title, children, tag = 'Người quyết định', actions }: { title: ReactNode; children: ReactNode; tag?: string | null; actions?: ReactNode }) {
  return (
    <section className={styles.hmb}>
      <div className={styles.hmbHead}>
        {tag && <HumanTag>{tag}</HumanTag>}
        <span>{title}</span>
        {actions && <span className={styles.blockAct}>{actions}</span>}
      </div>
      <div className={styles.blockBody}>{children}</div>
    </section>
  );
}
