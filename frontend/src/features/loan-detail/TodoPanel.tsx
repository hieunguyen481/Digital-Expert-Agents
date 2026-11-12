import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAgentCase } from '@/services/agentCaseService';
import { packageOf } from '@/features/dashboard/agentTrace';
import { HumanBlock } from '@/components/ui';
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
  if (overview.supplement_request) items.push({ key: 'supplement', text: overview.supplement_request.kind === 'RETURNED' ? 'Hồ sơ bị trả lại, cần chỉnh sửa và gửi lại' : overview.supplement_request.kind === 'RETURNED_TO_APPRAISAL' ? `Hồ sơ bị trả lại để bổ sung${overview.supplement_request.reason ? `: ${overview.supplement_request.reason}` : ''}` : overview.supplement_request.kind === 'EXPLANATION' ? `Hồ sơ đang chờ giải trình${overview.supplement_request.reason ? `: ${overview.supplement_request.reason}` : ''}` : 'Hồ sơ đang chờ bổ sung tài liệu', to: overview.supplement_request.kind === 'RETURNED_TO_APPRAISAL' ? undefined : `/doi-chieu/${overview.loan.id}`, anchor: overview.supplement_request.kind === 'RETURNED_TO_APPRAISAL' ? 'hanh-dong' : undefined });
  state?.blockers.forEach((b) => items.push({
    key: `b-${b}`, text: BLOCKERS[b] ?? b,
    anchor: b === 'FLAGS_OPEN' ? 'co' : b === 'REPORT_MISSING' ? 'to-trinh' : ['RISK_OPINION_MISSING', 'COMPLIANCE_OPINION_MISSING', 'CIC_FLAG_UNCONCLUDED'].includes(b) ? 'hanh-dong' : undefined,
    to: ['FIELDS_UNCONFIRMED', 'CHECK_FAILED', 'VALIDITY_AT_APPROVAL'].includes(b) ? `/doi-chieu/${overview.loan.id}` : undefined,
  }));
  const conflicts = overview.metrics.filter((m) => m.conflict_id && !m.chosen).length;
  if (conflicts > 0) items.push({ key: 'conflicts', text: `${conflicts} chỉ số còn mâu thuẫn giữa các nguồn, chưa chốt`, to: `/doi-chieu/${overview.loan.id}` });
  if (runs?.can_run && !runs.latest) items.push({ key: 'agent', text: 'Chưa có đề xuất AI. Chạy đội agent để có ý kiến tham khảo.', anchor: 'doi-agent' });
  return items;
}

export function TodoPanel({ items, ready, caseId }: { items: TodoItem[]; ready: boolean; caseId?: string | null }) {
  // Cùng khóa với AgentTeamPanel nên dùng chung dữ liệu, không gọi thêm.
  const caseQ = useQuery({ queryKey: ['agent-case', caseId], queryFn: () => getAgentCase(caseId!), enabled: !!caseId });
  const aiConditions = caseQ.data ? (caseQ.data.package ?? packageOf([]))?.conditions?.length ?? 0 : 0;
  const needsInfo = caseQ.data?.state === 'Needs Info';
  return (
    <div id="viec-can-lam" aria-label="Việc cần làm" data-testid="todo-panel">
      <HumanBlock tag="Việc của bạn" title={<>Việc cần làm {ready && items.length > 0 && <span className={styles.count}>{items.length}</span>}</>}>
        {ready && items.length === 0 && (aiConditions > 0 || needsInfo) && <span className={styles.warnLine} data-testid="todo-ai-needs"><ExclamationCircleOutlined /> {aiConditions > 0 ? `AI nêu ${aiConditions} điểm cần bổ sung` : 'AI nêu điểm cần bổ sung'}; xem khối Đội agent. Chưa có điều kiện hệ thống nào chặn bước này.</span>}
        {ready && items.length === 0 && aiConditions === 0 && !needsInfo && <span className={styles.ok}><CheckCircleOutlined /> Không còn điều kiện nào đang chặn ở bước này.</span>}
        {!ready && <span className={styles.note}>Đang kiểm tra điều kiện…</span>}
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
      </HumanBlock>
    </div>
  );
}
