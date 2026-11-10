import { Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { fmtDate, fmtNum } from './format';
import { statusLabel, stepLabel } from '@/features/my-work/format';
import type { LoanOverview } from './types';
import styles from './loan-header.module.css';

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

/** Header dính: tên khách, bước, hạn, mục lục; nút chính đưa người dùng tới khối Hành động. */
export function LoanHeader({ overview, todoCount }: { overview: LoanOverview; todoCount: number }) {
  const { loan, timeline } = overview;
  const current = timeline.find((s) => !s.completed_at);
  const stage = stageIndex(loan.status);
  const approved = loan.approved_amount != null && Number(loan.approved_amount) > 0;
  return (
    <div className={styles.header} data-testid="loan-header">
      <nav aria-label="Đường dẫn" className={styles.crumb}>
        <Link to="/viec-cua-toi">Việc của tôi</Link> › <span>Hồ sơ {loan.application_number}</span>
      </nav>
      <div className={styles.row}>
        <Typography.Title level={1} className={styles.title}>{loan.customer_name ?? loan.application_number}</Typography.Title>
        <Tag color="blue" data-testid="loan-status">{statusLabel(loan.status)}</Tag>
        <span className={styles.facts}>
          {[loan.application_number,
            `${fmtNum(Number(loan.requested_amount) / 1e9)} tỷ ${loan.currency}`,
            loan.requested_term_months ? `${loan.requested_term_months} tháng` : null,
            approved ? `Được duyệt: ${fmtNum(Number(loan.approved_amount) / 1e9)} tỷ ${loan.currency}${loan.approved_term_months ? ` · ${loan.approved_term_months} tháng` : ''}` : null,
            loan.assignee_name ? `Đang giữ: ${loan.assignee_name}` : null,
          ].filter(Boolean).join(' · ')}
        </span>
        <button type="button" className={styles.primary} onClick={() => goTo('hanh-dong')}>
          {todoCount > 0 ? `Còn ${todoCount} việc · tới phần hành động` : 'Tới phần hành động'}
        </button>
      </div>
      <ol className={styles.stepper} aria-label="Các chặng của hồ sơ">
        {STAGES.map((s, i) => (
          <li key={s} className={i < stage ? styles.done : i === stage ? styles.now : undefined} aria-current={i === stage ? 'step' : undefined}>
            <span className={styles.dot}>{i < stage ? '✓' : i + 1}</span>{s}
          </li>
        ))}
        {current && (
          <li className={styles.due}>
            {stepLabel(current.step_code)} · {current.due_at ? `hạn ${fmtDate(current.due_at)}` : 'không đặt hạn'}
          </li>
        )}
      </ol>
      <nav aria-label="Mục lục hồ sơ" className={styles.toc}>
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} onClick={(e) => { e.preventDefault(); goTo(s.id); }}>{s.label}</a>
        ))}
      </nav>
    </div>
  );
}
