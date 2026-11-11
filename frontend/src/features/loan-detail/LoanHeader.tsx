import { Typography } from 'antd';
import { Link } from 'react-router-dom';
import { CaseStepper, StatusPill } from '@/components/ui';
import { fmtDate, fmtNum } from './format';
import { statusLabel, stepLabel } from '@/features/my-work/format';
import type { LoanOverview } from './types';
import styles from './loan-detail.module.css';

/** Các chặng chính của một hồ sơ; trạng thái chi tiết (chờ bổ sung, tạm dừng…) quy về chặng đang đứng. */
export const STAGES = ['Soạn đề xuất', 'Kiểm tra', 'Thẩm định', 'Rủi ro', 'Phê duyệt', 'Hoàn tất'] as const;

export function stageIndex(status: string): number {
  if (status === 'DRAFT' || status === 'RETURNED_TO_RM') return 0;
  if (status === 'CHECKING') return 1;
  if (status.startsWith('APPRAISAL')) return 2;
  if (status.startsWith('RISK')) return 3;
  if (status === 'APPROVAL' || status === 'COUNCIL_SESSION') return 4;
  return 5;
}

/** Chặng cao nhất hồ sơ từng đi tới (bỏ qua bước của QHKH), để hồ sơ trả về giữ lịch sử. */
export function reachedStage(timeline: Array<{ step_code: string }>): number {
  let top = 0;
  for (const t of timeline) {
    const c = t.step_code;
    const i = c === 'CHECKING' ? 1 : c.startsWith('APPRAISAL') ? 2 : c.startsWith('RISK') ? 3 : c === 'APPROVAL' || c === 'COUNCIL_SESSION' ? 4 : 0;
    if (i > top) top = i;
  }
  return top;
}

export const SECTIONS = [
  { id: 'viec-can-lam', label: 'Việc cần làm' },
  { id: 'doi-agent', label: 'Đội agent' },
  { id: 'chi-so', label: 'Chỉ số' },
  { id: 'co', label: 'Cờ' },
  { id: 'to-trinh', label: 'Tờ trình' },
  { id: 'tai-san', label: 'Tài sản' },
  { id: 'nhat-ky', label: 'Nhật ký' },
  { id: 'hanh-dong', label: 'Hành động' },
] as const;

export function goTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Đầu trang hồ sơ (mockup 03): tên khách, dữ kiện, một nút đồng, bước hồ sơ, mục lục. */
export function LoanHeader({ overview, todoCount }: { overview: LoanOverview; todoCount: number }) {
  const { loan, timeline } = overview;
  const current = timeline.find((s) => !s.completed_at);
  // Hồ sơ đã có quyết định cuối (duyệt, từ chối): mọi chặng đã xong.
  const stage = loan.status.startsWith('APPROVED') || loan.status === 'REJECTED' ? STAGES.length : stageIndex(loan.status);
  const returnedFrom = loan.status === 'RETURNED_TO_RM' ? reachedStage(timeline) : 0;
  const approved = loan.decision_type !== 'REJECTED' && loan.approved_amount != null && Number(loan.approved_amount) > 0;
  const facts: Array<[string, string, boolean?]> = [
    ['Mã hồ sơ', loan.application_number, true],
    ['Số tiền', `${fmtNum(Number(loan.requested_amount) / 1e9)} tỷ ${loan.currency}`, true],
  ];
  if (loan.requested_term_months) facts.push(['Kỳ hạn', `${loan.requested_term_months} tháng`, true]);
  if (approved) facts.push(['Được duyệt', `${fmtNum(Number(loan.approved_amount) / 1e9)} tỷ ${loan.currency}${loan.approved_term_months ? ` · ${loan.approved_term_months} tháng` : ''}`, true]);
  if (loan.assignee_name) facts.push(['Đang giữ', loan.assignee_name]);
  return (
    <div data-testid="loan-header">
      <nav aria-label="Đường dẫn" className={styles.crumb}>
        <Link to="/viec-cua-toi">Việc của tôi</Link> / <span aria-current="page">Hồ sơ {loan.application_number}</span>
      </nav>
      <div className={styles.headRow}>
        <div className={styles.headTitle}>
          <Typography.Title level={1}>{loan.customer_name ?? loan.application_number}</Typography.Title>
          <dl className={styles.meta}>
            {facts.map(([k, v, mono]) => (
              <div key={k}><dt>{k}: </dt><dd className={mono ? styles.num : undefined}>{v}</dd></div>
            ))}
          </dl>
        </div>
        <div className={styles.headAct}>
          <span data-testid="loan-status"><StatusPill tone={loan.status === 'REJECTED' || loan.status === 'RETURNED_TO_RM' ? 'bad' : loan.status.startsWith('APPROVED') ? 'ok' : 'info'}>{statusLabel(loan.status)}</StatusPill></span>
          {todoCount > 0 && <StatusPill tone="neutral">Còn {todoCount} việc</StatusPill>}
          <span id="loan-primary-action" className={styles.headSlot} />
        </div>
      </div>
      <div className={styles.stepWrap}>
        <CaseStepper current={stage} returned={loan.status === 'RETURNED_TO_RM'} steps={STAGES}
          backAt={returnedFrom > 0 ? returnedFrom : undefined} notes={returnedFrom > 0 ? { 0: '(đang sửa)', [returnedFrom]: '(trả về QHKH)' } : undefined} />
      </div>
      {current && (
        <div className={styles.due}>
          {stepLabel(current.step_code)} · {current.due_at ? `hạn ${fmtDate(current.due_at)}` : 'không đặt hạn'}
        </div>
      )}
      <nav aria-label="Mục lục hồ sơ" className={styles.toc}>
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} onClick={(e) => { e.preventDefault(); goTo(s.id); }}>{s.label}</a>
        ))}
      </nav>
    </div>
  );
}
