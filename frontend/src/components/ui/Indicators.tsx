import type { ReactNode } from 'react';
import styles from './ui.module.css';

export type PillTone = 'neutral' | 'ok' | 'warn' | 'bad' | 'info' | 'ai' | 'human';
const PILL: Record<PillTone, string> = {
  neutral: '',
  ok: styles.ok,
  warn: styles.warn,
  bad: styles.bad,
  info: styles.info,
  ai: styles.ai,
  human: styles.human,
};

/** Badge trạng thái: nhãn chữ trên nền màu nhạt (không dùng riêng màu làm tín hiệu). */
export function StatusPill({ tone = 'neutral', outlined = false, children }: { tone?: PillTone; outlined?: boolean; children: ReactNode }) {
  return <span className={[styles.badge, PILL[tone], outlined ? styles.outlined : ''].filter(Boolean).join(' ')}>{children}</span>;
}

/** Trạng thái dạng chữ (không nhãn), cho các cột thông tin trong bảng; `warn` in đậm màu cảnh báo. */
export function StatusText({ warn = false, children }: { warn?: boolean; children: ReactNode }) {
  return <span className={[styles.dueText, warn ? styles.dueWarn : ''].filter(Boolean).join(' ')}>{children}</span>;
}

const FLAG_CLASS = { g: styles.flagG, y: styles.flagY, r: styles.flagR } as const;
/** Cờ rủi ro: xanh = hình thoi, vàng = hình thoi, đỏ = hình tròn; luôn kèm chữ. */
export function Flag({ level, children }: { level: 'g' | 'y' | 'r'; children: ReactNode }) {
  return (
    <span className={`${styles.flag} ${FLAG_CLASS[level]}`}>
      <i aria-hidden />
      {children}
    </span>
  );
}

/** Thẻ chỉ số; `hero` = chỉ số chính của trang (số lớn hơn), mỗi trang một thẻ. */
export function KpiCard({ label, value, note, delta, hero }: { label: string; value: ReactNode; note?: ReactNode; delta?: ReactNode; hero?: boolean }) {
  return (
    <div className={`${styles.kpi} ${hero ? styles.kpiHero : ''}`}>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={styles.kpiValue}>
        {value}
        {note && <small className={styles.kpiNote}>{note}</small>}
      </div>
      {delta && <div className={styles.kpiDelta}>{delta}</div>}
    </div>
  );
}

export function AiTag({ children = 'AI đề xuất' }: { children?: ReactNode }) {
  return (
    <span className={styles.tagAi}>
      {children}
    </span>
  );
}
export function HumanTag({ children = 'Người quyết định' }: { children?: ReactNode }) {
  return <span className={styles.tagHm}>{children}</span>;
}
export function MeTag({ children = 'Việc của bạn' }: { children?: ReactNode }) {
  return <span className={styles.tagMe}>{children}</span>;
}
