import { fmtDay } from '@/utils/format';
import { Alert, Skeleton } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { PageError } from '@/components/common/PageError';
import { normalizeError } from '@/services/apiClient';
import { AgentTeamPanel } from './AgentTeamPanel';
import { ActionsPanel } from './ActionsPanel';
import { CollateralPanel, FlagsPanel, TimelinePanel } from './InfoPanels';
import { MemoPanel } from './MemoPanel';
import { MetricsPanel } from './MetricsPanel';
import { fetchOverview } from './loanDetailService';
import { LoanHeader } from './LoanHeader';
import { TodoPanel, buildTodos } from './TodoPanel';
import { fetchActionState, fetchAgentRuns } from './loanDetailService';
import { PreDisbursementPanel } from './PreDisbursementPanel';
import styles from './loan-detail.module.css';

export default function LoanDetailPage() {
  const { loanId = '' } = useParams();
  const q = useQuery({ queryKey: ['loan-overview', loanId], queryFn: () => fetchOverview(loanId) });
  const actions = useQuery({ queryKey: ['loan-actions', loanId], queryFn: () => fetchActionState(loanId) });
  const runs = useQuery({ queryKey: ['loan-agent-runs', loanId], queryFn: () => fetchAgentRuns(loanId) });
  if (q.isError) return <PageError title="Không tải được hồ sơ" error={normalizeError(q.error)} onRetry={() => void q.refetch()} />;
  if (!q.data) return <div className={styles.page} aria-busy><Skeleton active /></div>;
  const { loan, metrics, flags, collaterals, timeline, supplement_request } = q.data;
  const todos = buildTodos(q.data, actions.data, runs.data);
  return (
    <>
      <LoanHeader overview={q.data} todoCount={todos.length} />
      <div className={`${styles.page} ${styles.wrap}`}>
        {supplement_request && (
          <Alert type="warning" showIcon data-testid="supplement-request" message="Hồ sơ đang chờ bổ sung"
            description={<>
              <div>{supplement_request.reason ?? 'Người xử lý chưa ghi nội dung cụ thể.'}</div>
              <div>Hạn bổ sung: {supplement_request.due_at ? fmtDay(supplement_request.due_at) : '—'}</div>
              <Link to={`/doi-chieu/${loanId}`}>Tải tài liệu bổ sung</Link>
            </>} />
        )}
        <TodoPanel items={todos} ready={!!actions.data} />
        <AgentTeamPanel loanId={loanId} currency={loan.currency} />
        <MetricsPanel loanId={loanId} metrics={metrics} />
        <div className={styles.grid}>
          <FlagsPanel flags={flags} />
          <TimelinePanel steps={timeline} />
        </div>
        <PreDisbursementPanel loanId={loanId} status={loan.status} decisionConditions={loan.conditions} />
        <MemoPanel key={loan.status} loanId={loanId} />
        <CollateralPanel items={collaterals} />
        <ActionsPanel loanId={loanId} overview={q.data} />
      </div>
    </>
  );
}
