import { Link } from 'react-router-dom';
import { CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { BLOCKERS } from './ActionsPanel';
import { goTo } from './LoanHeader';
import type { CaseActionState, LoanOverview } from './types';
import type { AgentRunOverview } from './loanDetailService';
import styles from './loan-detail.module.css';

const TERMINAL = new Set(['WITHDRAWN', 'APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED']);

export interface TodoItem { key: string; text: string; to?: string; anchor?: string }

/** Việc còn lại, lấy từ dữ liệu thật của hồ sơ (điều kiện chặn, cờ, mâu thuẫn, bổ sung, đội agent). Không dựng số. */
export function buildTodos(overview: LoanOverview, state: CaseActionState | undefined, runs: AgentRunOverview | undefined): TodoItem[] {
  const items: TodoItem[] = [];
  // L14: hồ sơ đã kết thúc (rút, quyết định) thì không còn việc.
  if (TERMINAL.has(overview.loan.status)) return items;
  if (overview.supplement_request) items.push({ key: 'supplement', text: overview.supplement_request.kind === 'RETURNED' ? 'Hồ sơ bị trả lại, cần chỉnh sửa và gửi lại' : 'Hồ sơ đang chờ bổ sung tài liệu', to: `/doi-chieu/${overview.loan.id}` });
  state?.blockers.forEach((b) => items.push({ key: `b-${b}`, text: BLOCKERS[b] ?? b, anchor: b === 'FLAGS_OPEN' ? 'co' : b === 'REPORT_MISSING' ? 'to-trinh' : undefined }));
  const conflicts = overview.metrics.filter((m) => m.conflict_id && !m.chosen).length;
  if (conflicts > 0) items.push({ key: 'conflicts', text: `${conflicts} chỉ số còn mâu thuẫn giữa các nguồn, chưa chốt`, to: `/doi-chieu/${overview.loan.id}` });
  if (runs?.can_run && !runs.latest) items.push({ key: 'agent', text: 'Chưa chạy đội agent: nên chạy để có đề xuất tham khảo', anchor: 'doi-agent' });
  return items;
}

export function TodoPanel({ items, ready }: { items: TodoItem[]; ready: boolean }) {
  return (
    <section id="viec-can-lam" className={`${styles.panel} ${styles.todo}`} aria-label="Việc cần làm" data-testid="todo-panel">
      <h2>Việc cần làm {ready && items.length > 0 && <span className={styles.count}>{items.length}</span>}</h2>
      {ready && items.length === 0 && <span className={styles.okLine}><CheckCircleOutlined /> Không còn điều kiện nào đang chặn ở bước này.</span>}
      {items.length > 0 && (
        <ul className={styles.todoList}>
          {items.map((t) => (
            <li key={t.key}>
              <ExclamationCircleOutlined />
              <span>{t.text}</span>
              {t.to && <Link to={t.to}>Mở</Link>}
              {t.anchor && <a href={`#${t.anchor}`} onClick={(e) => { e.preventDefault(); goTo(t.anchor!); }}>Đi tới</a>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
