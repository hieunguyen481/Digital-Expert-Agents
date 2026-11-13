import { useQuery } from '@tanstack/react-query';
import { getAgentCase } from '@/services/agentCaseService';
import { AiTag, StatusPill } from '@/components/ui';
import { cleanAiLine } from '@/features/dashboard/agentTrace';
import { fetchAgentRuns } from './loanDetailService';
import type { DisbursementCondition } from './types';
import styles from './loan-detail.module.css';

const when = (iso: string) => new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });

const APPROVED = ['APPROVED', 'APPROVED_WITH_CONDITIONS'];

/** Điều kiện phải hoàn tất trước giải ngân: đã ghi trên hồ sơ (người xác nhận đề xuất của đội agent), từ quyết định phê duyệt và gợi ý chưa xác nhận của đội agent (chỉ hiển thị). */
export function PreDisbursementPanel({ loanId, status, decisionConditions, confirmed = [] }: { loanId: string; status: string; decisionConditions?: string[] | null; confirmed?: DisbursementCondition[] }) {
  const approved = APPROVED.includes(status);
  const runsQ = useQuery({ queryKey: ['loan-agent-runs', loanId], queryFn: () => fetchAgentRuns(loanId), enabled: approved });
  const caseId = runsQ.data?.latest?.case_id;
  const caseQ = useQuery({ queryKey: ['agent-case', caseId], queryFn: () => getAgentCase(caseId!), enabled: !!caseId });
  const fromDecision = !approved ? [] : (decisionConditions ?? []).filter(Boolean);
  const confirmedText = confirmed.map((c) => cleanAiLine(c.text));
  const fromAgents = !approved ? [] : (caseQ.data?.package?.conditions ?? []).filter((c) => !fromDecision.includes(c) && !confirmedText.includes(cleanAiLine(c)));
  return (
    <section className={styles.card} data-testid="pre-disbursement" aria-label="Điều kiện trước giải ngân">
      <div className={styles.cardH}><h2>Điều kiện trước giải ngân</h2></div>
      <div className={styles.cardB}>
        {confirmed.length === 0 && fromDecision.length === 0 && fromAgents.length === 0 && <span className={styles.note} data-testid="pre-disbursement-empty">Chưa có điều kiện nào được ghi</span>}
        {confirmed.map((c) => (
          <div key={c.id} className={styles.item} data-testid="pre-disbursement-confirmed" data-origin={c.origin}>
            <span className={styles.readText}>{cleanAiLine(c.text)}</span>
            <span className={styles.note}>
              {c.origin === 'AGENT_PROPOSED' && <><AiTag>AI đề xuất</AiTag> </>}
              <StatusPill tone="ok">{c.origin === 'AGENT_PROPOSED' ? 'Đã được người xác nhận' : 'Do người ghi'}</StatusPill>
              {' '}{c.confirmed_by_name ?? 'Cán bộ'} · {when(c.created_at)}
            </span>
          </div>
        ))}
        {fromDecision.map((c) => <span key={`d-${c}`} data-testid="pre-disbursement-decision">Từ quyết định: {cleanAiLine(c)}</span>)}
        {fromAgents.map((c) => <span key={`a-${c}`} data-testid="pre-disbursement-agent"><AiTag>AI đề xuất</AiTag> Từ đội agent, chưa xác nhận: {cleanAiLine(c)}</span>)}
      </div>
    </section>
  );
}
