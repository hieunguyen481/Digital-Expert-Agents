import { Link } from 'react-router-dom';
import { fmtDate, fmtNum, sourceTypeLabel } from './format';
import type { Metric, MetricValue } from './types';
import styles from './loan-detail.module.css';

function Source({ loanId, m }: { loanId: string; m: MetricValue }) {
  // Mọi số đều có tài liệu nguồn (backend bỏ số không có nguồn); trang 05 mở theo hồ sơ.
  return (
    <span className={styles.src} data-testid="metric-source">
      Nguồn: <Link to={`/doi-chieu/${loanId}`}>{m.document_title ?? 'Tài liệu'}</Link>
      {m.page_number != null ? `, trang ${m.page_number}` : ''} · {sourceTypeLabel(m.source_type)}
      {m.verified_by_name ? ` · ${m.verified_by_name} xác nhận ${fmtDate(m.verified_at)}` : ' · chưa người xác nhận'}
      {m.note ? ` · ${m.note}` : ''}
    </span>
  );
}

function ValueCell({ loanId, metric, v }: { loanId: string; metric: Metric; v: MetricValue }) {
  const chosen = metric.chosen?.field_id === v.field_id;
  return (
    <div className={styles.mVal} data-testid={`metric-${metric.code}-${v.kind}`}>
      <span className={styles.mLine}>
        <span className={styles.mNum}>{v.kind === 'RECOMPUTED' ? '≈ ' : ''}{fmtNum(v.value_number, metric.unit)}</span>
        {v.result && <span className={v.result === 'PASS' ? styles.mPass : styles.mFail}>{v.result === 'PASS' ? 'Đạt' : 'Không đạt'}</span>}
        {chosen && <span className={styles.mChosen}>Nguồn đã chốt</span>}
      </span>
      <Source loanId={loanId} m={v} />
    </div>
  );
}

/** Chú thích dưới KPI: số tái tính (≈) khác số khách khai thì nói rõ có hai số và xem bảng bên dưới. */
export function kpiNote(m: Metric, v: MetricValue): string | undefined {
  if (v.kind !== 'RECOMPUTED') return undefined;
  const other = m.values.find((x) => x.kind !== 'RECOMPUTED' && x.value_number != null);
  if (!other || other.value_number == null || v.value_number == null || other.value_number === v.value_number) return undefined;
  return `Số tái tính từ tài liệu; khách khai ${fmtNum(other.value_number)}. Xem Chỉ số tài chính.`;
}

export function MetricsPanel({ loanId, metrics }: { loanId: string; metrics: Metric[] }) {
  return (
    <section id="chi-so" className={styles.card} aria-label="Chỉ số tài chính">
      <div className={styles.cardH}><h2>Chỉ số tài chính</h2></div>
      <div className={styles.cardB}>
        {metrics.length === 0 && <span className={styles.note}>Chưa có chỉ số nào có tài liệu nguồn.</span>}
        {metrics.length > 0 && <table className={styles.mTable} data-testid="metrics-table">
          <thead>
            <tr><th scope="col">Chỉ số</th><th scope="col">Khách khai báo</th><th scope="col">Tính lại từ tài liệu</th></tr>
          </thead>
          <tbody>
            {metrics.map((m) => {
              const declared = m.values.filter((v) => v.kind !== 'RECOMPUTED');
              const recomputed = m.values.filter((v) => v.kind === 'RECOMPUTED');
              return (
                <tr key={m.code} data-testid={`metric-row-${m.code}`}>
                  <th scope="row">
                    <span className={styles.mName}>{m.label}</span>
                    <span className={styles.mRule}>{m.threshold ? `Ngưỡng ${m.threshold.op === '>=' ? '≥' : '≤'} ${fmtNum(m.threshold.value, m.unit)}` : 'Chính sách không đặt ngưỡng'}</span>
                  </th>
                  <td>{declared.length ? declared.map((v) => <ValueCell key={v.kind} loanId={loanId} metric={m} v={v} />) : <span className={styles.mNone}>—</span>}</td>
                  <td>
                    {recomputed.length ? recomputed.map((v) => <ValueCell key={v.kind} loanId={loanId} metric={m} v={v} />) : <span className={styles.mNone}>—</span>}
                    {m.chosen && (
                      <span className={styles.src}>
                        Đã chốt: {m.chosen.resolved_by_name ?? '—'}{m.chosen.reason ? `, ${m.chosen.reason}` : ''}
                      </span>
                    )}
                    {m.conflict_id && !m.chosen && <span className={styles.mConflict}>Hai số còn mâu thuẫn, chưa chốt · <Link to={`/doi-chieu/${loanId}`}>Đối chiếu tài liệu</Link></span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>}
      </div>
    </section>
  );
}
