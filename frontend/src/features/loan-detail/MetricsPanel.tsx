import { Tag } from 'antd';
import { Link } from 'react-router-dom';
import { KIND_LABEL, fmtDate, fmtNum, sourceTypeLabel } from './format';
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
    <div data-testid={`metric-${metric.code}-${v.kind}`}>
      <span>{KIND_LABEL[v.kind]}: </span>
      <span className={styles.num}>{v.kind === 'RECOMPUTED' ? '≈ ' : ''}{fmtNum(v.value_number, metric.unit)}</span>
      {v.result && <Tag color={v.result === 'PASS' ? 'success' : 'error'} style={{ marginLeft: 8 }}>{v.result === 'PASS' ? 'Đạt' : 'Không đạt'}</Tag>}
      {chosen && <Tag color="processing">Nguồn đã chốt khi đối chiếu</Tag>}
      <Source loanId={loanId} m={v} />
    </div>
  );
}

export function MetricsPanel({ loanId, metrics }: { loanId: string; metrics: Metric[] }) {
  return (
    <section id="chi-so" className={styles.panel} aria-label="Chỉ số tài chính">
      <h2>Chỉ số tài chính</h2>
      {metrics.length === 0 && <span className={styles.note}>Chưa có chỉ số nào có tài liệu nguồn.</span>}
      {metrics.length > 0 && <table style={{ width: '100%' }} data-testid="metrics-table">
        <thead>
          <tr><th align="left">Chỉ số</th><th align="left">Giá trị và nguồn</th><th align="left">Ngưỡng chính sách</th></tr>
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr key={m.code} data-testid={`metric-row-${m.code}`} style={{ verticalAlign: 'top' }}>
              <td>{m.label}</td>
              <td>
                {m.values.map((v) => <ValueCell key={v.kind} loanId={loanId} metric={m} v={v} />)}
                {m.chosen && (
                  <span className={styles.src}>
                    Đã chốt: {m.chosen.resolved_by_name ?? '—'}{m.chosen.reason ? ` — ${m.chosen.reason}` : ''}
                  </span>
                )}
                {m.conflict_id && !m.chosen && <Tag color="warning">Mâu thuẫn chưa chốt · <Link to={`/doi-chieu/${loanId}`}>Đối chiếu tài liệu</Link></Tag>}
              </td>
              <td>{m.threshold ? `${m.threshold.op === '>=' ? '≥' : '≤'} ${fmtNum(m.threshold.value, m.unit)}` : 'Không có ngưỡng trong chính sách'}</td>
            </tr>
          ))}
        </tbody>
      </table>}
    </section>
  );
}
