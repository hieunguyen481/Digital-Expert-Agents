import { useQuery } from '@tanstack/react-query';
import { getAgentCase } from '@/services/agentCaseService';
import { fetchAgentRuns } from './loanDetailService';
import styles from './loan-detail.module.css';

const APPROVED = ['APPROVED', 'APPROVED_WITH_CONDITIONS'];

/** Điều kiện phải hoàn tất trước giải ngân: từ quyết định phê duyệt và từ đội agent (chỉ hiển thị, chưa có giải ngân). */
export function PreDisbursementPanel({ loanId, status, decisionConditions }: { loanId: string; status: string; decisionConditions?: string[] | null }) {
  const approved = APPROVED.includes(status);
  const runsQ = useQuery({ queryKey: ['loan-agent-runs', loanId], queryFn: () => fetchAgentRuns(loanId), enabled: approved });
  const caseId = runsQ.data?.latest?.case_id;
  const caseQ = useQuery({ queryKey: ['agent-case', caseId], queryFn: () => getAgentCase(caseId!), enabled: !!caseId });
  if (!approved) return null;
  const fromDecision = (decisionConditions ?? []).filter(Boolean);
  const fromAgents = (caseQ.data?.package?.conditions ?? []).filter((c) => !fromDecision.includes(c));
  return (
    <section className={styles.card} data-testid="pre-disbursement" aria-label="Điều kiện trước giải ngân">
      <div className={styles.cardH}><h2>Điều kiện trước giải ngân</h2></div>
      <div className={styles.cardB}>
        {fromDecision.length === 0 && fromAgents.length === 0 && <span className={styles.note}>Không có điều kiện nào được ghi nhận.</span>}
        {fromDecision.map((c) => <span key={`d-${c}`} data-testid="pre-disbursement-decision">Từ quyết định: {c}</span>)}
        {fromAgents.map((c) => <span key={`a-${c}`} data-testid="pre-disbursement-agent">Từ đội agent: {c}</span>)}
      </div>
    </section>
  );
}
