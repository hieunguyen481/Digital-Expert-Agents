import { Table } from 'antd';
import { AiBlock, Flag as FlagMark, Timeline, ledgerNum, ledgerTable, type TimelineEntry } from '@/components/ui';
import { conclusionLabel, flagSourceLabel, flagStatusLabel, fmtDate, fmtMoney, ownershipLabel, severityLabel, stepResultLabel, valuationLabel } from './format';
import { stepLabel } from '@/features/my-work/format';
import type { Collateral, Flag, TimelineStep } from './types';
import styles from './loan-detail.module.css';

const SEV: Record<string, 'r' | 'y' | 'g'> = { HIGH: 'r', MEDIUM: 'y', LOW: 'g' };

function FlagRow({ f }: { f: Flag }) {
  return (
    <div className={styles.item} data-testid="flag-row">
      <div>
        <FlagMark level={SEV[f.severity] ?? 'g'}>{severityLabel(f.severity)}</FlagMark>{' '}
        <b>{f.title}</b> · {flagStatusLabel(f.status)}
      </div>
      <span className={styles.note}>Nguồn: {flagSourceLabel(f.source)}{f.blocks_submission ? ' · chặn trình' : ''}</span>
      {f.handling_note && <span>{f.handling_note}</span>}
      {f.compliance_conclusion && <span>Kết luận Tuân thủ: {conclusionLabel(f.compliance_conclusion)}{f.compliance_reason ? ` — ${f.compliance_reason}` : ''}</span>}
    </div>
  );
}

/** Cờ do AI sinh nằm trong khối AI (viền nét đứt tím); cờ do hệ thống hoặc người đặt ở ngoài. */
export function FlagsPanel({ flags }: { flags: Flag[] }) {
  const ai = flags.filter((f) => f.source.startsWith('AI_'));
  const other = flags.filter((f) => !f.source.startsWith('AI_'));
  return (
    <section id="co" className={styles.card} aria-label="Cờ cảnh báo">
      <div className={styles.cardH}><h2>Cờ cảnh báo</h2></div>
      <div className={styles.cardB}>
        {flags.length === 0 && <span className={styles.note}>Không có cờ.</span>}
        {ai.length > 0 && (
          <AiBlock title="Cờ do AI kiểm tra tài liệu">
            <div className={styles.stackTight}>{ai.map((f) => <FlagRow key={f.id} f={f} />)}</div>
          </AiBlock>
        )}
        {other.map((f) => <FlagRow key={f.id} f={f} />)}
      </div>
    </section>
  );
}

export function CollateralPanel({ items }: { items: Collateral[] }) {
  return (
    <section id="tai-san" className={styles.card} aria-label="Tài sản bảo đảm">
      <div className={styles.cardH}><h2>Tài sản bảo đảm</h2></div>
      <Table<Collateral>
        className={ledgerTable} rowKey="id" size="small" pagination={false} dataSource={items} locale={{ emptyText: 'Chưa có tài sản bảo đảm' }}
        columns={[
          { title: 'Tài sản', render: (_, r) => <div>{r.description ?? r.collateral_type}<span className={styles.src}>Chủ sở hữu: {r.owner_name}</span></div> },
          { title: 'Giá trị khai báo', align: 'right', className: ledgerNum, render: (_, r) => fmtMoney(r.declared_value, r.currency) },
          { title: 'Giá trị thẩm định', align: 'right', className: ledgerNum, render: (_, r) => fmtMoney(r.appraised_value, r.currency) },
          { title: 'Định giá', render: (_, r) => <div>{valuationLabel(r.valuation_status)}<span className={styles.src}>{fmtDate(r.valuation_date)} · sở hữu: {ownershipLabel(r.ownership_verification_status)}</span></div> },
        ]}
      />
    </section>
  );
}

export function TimelinePanel({ steps }: { steps: TimelineStep[] }) {
  // Dòng mới nhất lên trên; bước chưa xong là mục hiện tại.
  const entries: TimelineEntry[] = [...steps].reverse().map((s, i) => ({
    key: s.id,
    time: fmtDate(s.received_at),
    current: i === 0 && !s.completed_at,
    title: <span data-testid="timeline-row"><b>{stepLabel(s.step_code)}</b> · {s.assignee_name ?? '—'}</span>,
    body: (
      <div className={styles.tlStep}>
        <span className={styles.note}>
          {s.due_at ? `hạn ${fmtDate(s.due_at)}` : 'không đặt hạn'} · {s.completed_at ? `xong ${fmtDate(s.completed_at)}${s.result ? ` (${stepResultLabel(s.result)})` : ''}` : 'đang xử lý'}
        </span>
        {s.reason_restricted ? <span className={styles.note}>Lý do bị hạn chế theo vai trò</span> : s.reason && <span>{s.reason}</span>}
      </div>
    ),
  }));
  return (
    <section id="nhat-ky" className={styles.card} aria-label="Dòng thời gian">
      <div className={styles.cardH}><h2>Dòng thời gian</h2></div>
      <div className={styles.cardB}>
        {steps.length === 0 && <span className={styles.note}>Chưa có bước nào.</span>}
        {steps.length > 0 && <Timeline entries={entries} label="Các bước của hồ sơ" />}
      </div>
    </section>
  );
}
