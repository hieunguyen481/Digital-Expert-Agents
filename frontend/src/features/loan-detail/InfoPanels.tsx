import { Table, Tag } from 'antd';
import { fmtDate, fmtMoney } from './format';
import type { Collateral, Flag, TimelineStep } from './types';
import styles from './loan-detail.module.css';

const SEV: Record<string, string> = { HIGH: 'error', MEDIUM: 'warning', LOW: 'default' };

export function FlagsPanel({ flags }: { flags: Flag[] }) {
  return (
    <section className={styles.panel} aria-label="Cờ cảnh báo">
      <h2>Cờ cảnh báo</h2>
      {flags.length === 0 && <span className={styles.note}>Không có cờ.</span>}
      {flags.map((f) => (
        <div key={f.id} className={styles.section} data-testid="flag-row">
          <div><Tag color={SEV[f.severity] ?? 'default'}>{f.severity}</Tag><b>{f.title}</b> · {f.status}</div>
          <span className={styles.note}>Nguồn: {f.source}{f.blocks_submission ? ' · chặn trình' : ''}</span>
          {f.handling_note && <span>{f.handling_note}</span>}
          {f.compliance_conclusion && <span>Kết luận Tuân thủ: {f.compliance_conclusion}{f.compliance_reason ? ` — ${f.compliance_reason}` : ''}</span>}
        </div>
      ))}
    </section>
  );
}

export function CollateralPanel({ items }: { items: Collateral[] }) {
  return (
    <section className={styles.panel} aria-label="Tài sản bảo đảm">
      <h2>Tài sản bảo đảm</h2>
      <Table<Collateral>
        rowKey="id" size="small" pagination={false} dataSource={items} locale={{ emptyText: 'Chưa có tài sản bảo đảm' }}
        columns={[
          { title: 'Tài sản', render: (_, r) => <div>{r.description ?? r.collateral_type}<span className={styles.src}>Chủ sở hữu: {r.owner_name}</span></div> },
          { title: 'Giá trị khai báo', render: (_, r) => fmtMoney(r.declared_value, r.currency) },
          { title: 'Giá trị thẩm định', render: (_, r) => fmtMoney(r.appraised_value, r.currency) },
          { title: 'Định giá', render: (_, r) => <div>{r.valuation_status}<span className={styles.src}>{fmtDate(r.valuation_date)} · sở hữu: {r.ownership_verification_status}</span></div> },
        ]}
      />
    </section>
  );
}

export function TimelinePanel({ steps }: { steps: TimelineStep[] }) {
  return (
    <section className={styles.panel} aria-label="Dòng thời gian">
      <h2>Dòng thời gian</h2>
      {steps.length === 0 && <span className={styles.note}>Chưa có bước nào.</span>}
      {steps.map((s) => (
        <div key={s.id} className={styles.section} data-testid="timeline-row">
          <div><b>{s.step_code}</b> · {s.assignee_name ?? '—'}</div>
          <span className={styles.note}>
            Nhận {fmtDate(s.received_at)} · hạn {fmtDate(s.due_at)} · {s.completed_at ? `xong ${fmtDate(s.completed_at)}${s.result ? ` (${s.result})` : ''}` : 'đang xử lý'}
          </span>
          {s.reason_restricted ? <span className={styles.note}>Lý do bị hạn chế theo vai trò</span> : s.reason && <span>{s.reason}</span>}
        </div>
      ))}
    </section>
  );
}
