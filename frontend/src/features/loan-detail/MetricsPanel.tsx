import { KpiCard, StatusPill } from '@/components/ui';
import { Link } from 'react-router-dom';
import { KIND_LABEL, currencyWord, fmtDate, fmtNum, sourceTypeLabel } from './format';
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
      <span>{KIND_LABEL[v.kind]}: </span>
      <span className={styles.mNum}>{v.kind === 'RECOMPUTED' ? '≈ ' : ''}{fmtNum(v.value_number, metric.unit)}</span>
      {v.result && <>{' '}<StatusPill tone={v.result === 'PASS' ? 'ok' : 'bad'}>{v.result === 'PASS' ? 'Đạt' : 'Không đạt'}</StatusPill></>}
      {chosen && <>{' '}<StatusPill tone="info">Nguồn đã chốt khi đối chiếu</StatusPill></>}
      <Source loanId={loanId} m={v} />
    </div>
  );
}

/** Dải chỉ số chính: chỉ lấy số có thật của hồ sơ (đề nghị, kỳ hạn) và chỉ số đã có nguồn; thiếu thì không hiện. */
export function KpiStrip({ amountBillion, currency, termMonths, metrics }: { amountBillion: number; currency: string; termMonths: number | null; metrics: Metric[] }) {
  const pick = (code: string) => {
    const m = metrics.find((x) => x.code === code);
    const v = m?.values.find((x) => x.field_id === m.chosen?.field_id) ?? m?.values.find((x) => x.kind === 'RECOMPUTED') ?? m?.values[0];
    return m && v ? { m, v } : null;
  };
  const dscr = pick('dscr');
  const ltv = pick('ltv');
  return (
    <div className={styles.strip} role="group" aria-label="Chỉ số chính">
      <KpiCard label={`Đề nghị, tỷ ${currencyWord(currency)}`} value={fmtNum(amountBillion)} />
      {termMonths != null && <KpiCard label="Kỳ hạn, tháng" value={String(termMonths)} />}
      {[dscr, ltv].map((x) => x && <KpiCard key={x.m.code} label={`${x.m.label}${x.m.unit ? `, ${x.m.unit}` : ''}`} value={`${x.v.kind === 'RECOMPUTED' ? '≈ ' : ''}${fmtNum(x.v.value_number)}`} />)}
    </div>
  );
}

export function MetricsPanel({ loanId, metrics }: { loanId: string; metrics: Metric[] }) {
  return (
    <section id="chi-so" className={styles.card} aria-label="Chỉ số tài chính">
      <div className={styles.cardH}><h2>Chỉ số tài chính</h2></div>
      <div className={styles.cardB}>
        {metrics.length === 0 && <span className={styles.note}>Chưa có chỉ số nào có tài liệu nguồn.</span>}
        {metrics.length > 0 && <table className={styles.mTable} data-testid="metrics-table">
          <thead>
            <tr><th scope="col">Chỉ số</th><th scope="col">Giá trị và nguồn</th><th scope="col">Ngưỡng chính sách</th></tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m.code} data-testid={`metric-row-${m.code}`}>
                <td><b>{m.label}</b></td>
                <td>
                  {m.values.map((v) => <ValueCell key={v.kind} loanId={loanId} metric={m} v={v} />)}
                  {m.chosen && (
                    <span className={styles.src}>
                      Đã chốt: {m.chosen.resolved_by_name ?? '—'}{m.chosen.reason ? ` — ${m.chosen.reason}` : ''}
                    </span>
                  )}
                  {m.conflict_id && !m.chosen && <StatusPill tone="warn">Mâu thuẫn chưa chốt · <Link to={`/doi-chieu/${loanId}`}>Đối chiếu tài liệu</Link></StatusPill>}
                </td>
                <td className={styles.num}>{m.threshold ? `${m.threshold.op === '>=' ? '≥' : '≤'} ${fmtNum(m.threshold.value, m.unit)}` : 'Không có ngưỡng trong chính sách'}</td>
              </tr>
            ))}
          </tbody>
        </table>}
      </div>
    </section>
  );
}
