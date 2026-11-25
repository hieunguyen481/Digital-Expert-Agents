import type { ReactNode } from 'react';
import styles from './ui.module.css';

export interface TimelineEntry {
  key: string;
  time: string;
  title: ReactNode;
  body?: ReactNode;
  /** Mục do AI sinh: chấm xám. */
  ai?: boolean;
  /** Mục hiện tại: chấm đặc. */
  current?: boolean;
}

export function Timeline({ entries, label = 'Dòng thời gian' }: { entries: TimelineEntry[]; label?: string }) {
  return (
    <ol className={styles.tl} aria-label={label}>
      {entries.map((e) => (
        <li key={e.key} className={[e.ai ? styles.tlAi : '', e.current ? styles.tlCur : ''].filter(Boolean).join(' ')}>
          <time className={styles.tlTime}>{e.time}</time>
          <div className={styles.tlHead}>{e.title}</div>
          {e.body}
        </li>
      ))}
    </ol>
  );
}
