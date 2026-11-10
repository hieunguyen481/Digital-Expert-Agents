import type { ReactNode } from 'react';
import { AiTag, HumanTag } from './Indicators';
import styles from './ui.module.css';

/** Khối do AI sinh: viền nét đứt tím, nền tím nhạt, luôn có nhãn "AI đề xuất". Chưa phải quyết định. */
export function AiBlock({ title, children, tag = 'AI đề xuất' }: { title: ReactNode; children: ReactNode; tag?: string }) {
  return (
    <section className={styles.aib}>
      <div className={styles.aibHead}>
        <AiTag>{tag}</AiTag>
        <span>{title}</span>
      </div>
      <div className={styles.blockBody}>{children}</div>
    </section>
  );
}

/** Khối quyết định của người có thẩm quyền: viền liền, thanh navy bên trái, nhãn "Người quyết định". */
export function HumanBlock({ title, children, tag = 'Người quyết định' }: { title: ReactNode; children: ReactNode; tag?: string }) {
  return (
    <section className={styles.hmb}>
      <div className={styles.hmbHead}>
        <HumanTag>{tag}</HumanTag>
        <span>{title}</span>
      </div>
      <div className={styles.blockBody}>{children}</div>
    </section>
  );
}
