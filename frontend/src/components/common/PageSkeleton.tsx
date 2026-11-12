import styles from './PageSkeleton.module.css';

/** Khung xương trong vùng nội dung: giữ nguyên thanh trên và menu, kích thước gần thẻ thật để trang không nhảy. */
export function PageSkeleton({ kpis = 4, blocks = 2, testId = 'page-skeleton', bare = false }: {bare?: boolean; kpis?: number; blocks?: number; testId?: string }) {
  return (
    <div className={`${styles.wrap} ${bare ? styles.bare : ''}`} role="status" aria-live="polite" aria-busy data-testid={testId}>
      <span className="sr-only">Đang tải</span>
      {!bare && <div className={styles.title} aria-hidden />}
      {kpis > 0 && (
        <div className={styles.kpis} aria-hidden style={{ gridTemplateColumns: `1.3fr repeat(${kpis - 1}, minmax(0, 1fr))` }}>
          {Array.from({ length: kpis }, (_, i) => <div key={i} className={styles.kpi} />)}
        </div>
      )}
      {Array.from({ length: blocks }, (_, i) => <div key={i} className={styles.block} aria-hidden />)}
    </div>
  );
}
