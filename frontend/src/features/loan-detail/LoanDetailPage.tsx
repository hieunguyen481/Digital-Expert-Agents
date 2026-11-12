import { useMe } from '@/auth/session';
import { uiRoleFromRoles } from '@/auth/roleFromMe';
import { fmtDay } from '@/utils/format';
import { Alert, Skeleton } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { PageError } from '@/components/common/PageError';
import { normalizeError } from '@/services/apiClient';
import { RelatedPartiesReview } from '@/features/proposal/RelatedSection';
import { AgentTeamPanel } from './AgentTeamPanel';
import { ActionsPanel } from './ActionsPanel';
import { CollateralPanel, FlagsPanel, TimelinePanel } from './InfoPanels';
import { MemoPanel } from './MemoPanel';
import { KpiStrip, MetricsPanel } from './MetricsPanel';
import { fetchOverview } from './loanDetailService';
import { LoanHeader } from './LoanHeader';
import { TodoPanel, buildTodos } from './TodoPanel';
import { fetchActionState, fetchAgentRuns } from './loanDetailService';
import { ReassignControl } from './ReassignControl';
import { PreDisbursementPanel } from './PreDisbursementPanel';
import styles from './loan-detail.module.css';

export default function LoanDetailPage() {
  const { loanId = '' } = useParams();
  const q = useQuery({ queryKey: ['loan-overview', loanId], queryFn: () => fetchOverview(loanId) });
  const actions = useQuery({ queryKey: ['loan-actions', loanId], queryFn: () => fetchActionState(loanId) });
  const { data: me } = useMe();
  const readOnly = uiRoleFromRoles(me?.roles ?? []) === 'kiemtoan';
  const runs = useQuery({ queryKey: ['loan-agent-runs', loanId], queryFn: () => fetchAgentRuns(loanId) });
  if (q.isError) return <PageError title="Không tải được hồ sơ" headingLevel={1} error={normalizeError(q.error)} onRetry={() => void q.refetch()} />;
  if (!q.data) return <div className={styles.page} aria-busy><Skeleton active /></div>;
  const { loan, metrics, flags, collaterals, timeline, supplement_request } = q.data;
  const todos = buildTodos(q.data, actions.data, runs.data);
  return (
    <>
      <LoanHeader overview={q.data} todoCount={todos.length} />
      <div className={styles.page}>
        {supplement_request && (
          <Alert type="warning" showIcon data-testid="supplement-request" message={supplement_request.kind === 'RETURNED' ? 'Hồ sơ bị trả lại, cần chỉnh sửa' : supplement_request.kind === 'RETURNED_TO_APPRAISAL' ? 'Hồ sơ bị trả lại để bổ sung' : 'Hồ sơ đang chờ bổ sung'}
            description={<>
              <div>{supplement_request.reason ?? 'Người xử lý chưa ghi nội dung cụ thể.'}</div>
              <div>Hạn bổ sung: {supplement_request.due_at ? fmtDay(supplement_request.due_at) : '—'}</div>
              {supplement_request.kind !== 'RETURNED_TO_APPRAISAL' && <Link to={`/doi-chieu/${loanId}`}>Tải tài liệu bổ sung</Link>}
            </>} />
        )}
        <div className={styles.grid}>
          <div className={styles.stack}>
            <AgentTeamPanel loanId={loanId} currency={loan.currency} status={loan.status} />
            <KpiStrip amountBillion={Number(loan.requested_amount) / 1e9} currency={loan.currency} termMonths={loan.requested_term_months ?? null} metrics={metrics} />
            <MetricsPanel loanId={loanId} metrics={metrics} />
            <FlagsPanel flags={flags} />
            <PreDisbursementPanel loanId={loanId} status={loan.status} decisionConditions={loan.conditions} />
            <MemoPanel key={loan.status} loanId={loanId} />
            {loan.status === 'APPRAISAL' && actions.data?.can_write && <RelatedPartiesReview loanId={loanId} />}
            <CollateralPanel items={collaterals} />
          </div>
          <aside className={styles.stack} aria-label="Việc và hành động">
            {!readOnly && <TodoPanel items={todos} ready={!!actions.data} caseId={runs.data?.latest?.case_id} />}
            <ActionsPanel loanId={loanId} overview={q.data} />
            <ReassignControl loanId={loanId} />
            <TimelinePanel steps={timeline} />
          </aside>
        </div>
      </div>
    </>
  );
}
