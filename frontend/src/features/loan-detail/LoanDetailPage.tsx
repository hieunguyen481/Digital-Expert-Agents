import { useMe } from '@/auth/session';
import { uiRoleFromRoles } from '@/auth/roleFromMe';
import { fmtDay } from '@/utils/format';
import { useEffect } from 'react';
import { Alert, Skeleton } from 'antd';
import { useAiPanel } from '@/features/ai-panel/AiPanelContext';
import { loanCodeLabel } from '@/components/common/CodeText';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { PageError } from '@/components/common/PageError';
import { normalizeError } from '@/services/apiClient';
import { RelatedPartiesReview } from '@/features/proposal/RelatedSection';
import { AgentTeamPanel } from './AgentTeamPanel';
import { ActionsPanel } from './ActionsPanel';
import { CollateralPanel, FlagsPanel, TimelinePanel } from './InfoPanels';
import { MemoPanel } from './MemoPanel';
import { MetricsPanel } from './MetricsPanel';
import { fetchOverview } from './loanDetailService';
import { LoanHeader } from './LoanHeader';
import { TodoPanel, buildTodos } from './TodoPanel';
import { fetchActionState, fetchAgentRuns } from './loanDetailService';
import { ReassignControl } from './ReassignControl';
import { PreDisbursementPanel } from './PreDisbursementPanel';
import { EmptyBlocksNote, emptyBlocks, type EmptyKey } from './EmptyBlocksNote';
import styles from './loan-detail.module.css';

export default function LoanDetailPage() {
  const { loanId = '' } = useParams();
  const { setPageContext } = useAiPanel();
  const q = useQuery({ queryKey: ['loan-overview', loanId], queryFn: () => fetchOverview(loanId) });
  const actions = useQuery({ queryKey: ['loan-actions', loanId], queryFn: () => fetchActionState(loanId) });
  const { data: me } = useMe();
  const readOnly = uiRoleFromRoles(me?.roles ?? []) === 'kiemtoan';
  const runs = useQuery({ queryKey: ['loan-agent-runs', loanId], queryFn: () => fetchAgentRuns(loanId) });
  const appNo = q.data?.loan.application_number ?? null;
  useEffect(() => {
    setPageContext({ type: 'case', id: loanId, label: appNo ? loanCodeLabel(appNo, q.data?.loan.status) : 'Hồ sơ đang xem' });
    return () => setPageContext(null);
  }, [loanId, appNo, q.data?.loan.status, setPageContext]);
  if (q.isError) return <PageError title="Không tải được hồ sơ" headingLevel={1} error={normalizeError(q.error)} onRetry={() => void q.refetch()} />;
  if (!q.data) return <div className={styles.page} aria-busy><Skeleton active /></div>;
  const { loan, metrics, flags, collaterals, timeline, supplement_request } = q.data;
  const todos = buildTodos(q.data, actions.data, runs.data);
  // Các khối chưa có nội dung gộp thành một dòng khi từ hai khối trở lên rỗng; khối rỗng đơn lẻ giữ nguyên khung và câu giải thích riêng.
  const noConditions = (q.data.disbursement_conditions ?? []).length === 0 && !(['APPROVED', 'APPROVED_WITH_CONDITIONS'].includes(loan.status) && (loan.conditions ?? []).some(Boolean));
  const allEmpties = emptyBlocks({ metrics: metrics.length === 0, flags: flags.length === 0, conditions: noConditions, collaterals: collaterals.length === 0 });
  const empties = allEmpties.length >= 2 ? allEmpties : [];
  const isEmpty = (k: EmptyKey) => empties.some((e) => e.key === k);
  return (
    <>
      <LoanHeader overview={q.data} todoCount={todos.length} />
      <div className={styles.page}>
        {supplement_request && (
          <Alert type="warning" showIcon data-testid="supplement-request" message={supplement_request.kind === 'RETURNED' ? 'Hồ sơ bị trả lại, cần chỉnh sửa' : supplement_request.kind === 'RETURNED_TO_APPRAISAL' ? 'Hồ sơ bị trả lại để bổ sung' : supplement_request.kind === 'EXPLANATION' ? 'Hồ sơ đang chờ giải trình' : 'Hồ sơ đang chờ bổ sung'}
            description={<>
              <div>{supplement_request.reason ?? 'Người xử lý chưa ghi nội dung cụ thể.'}</div>
              <div>Hạn bổ sung: {supplement_request.due_at ? fmtDay(supplement_request.due_at) : '—'}</div>
              {supplement_request.kind !== 'RETURNED_TO_APPRAISAL' && <Link to={`/doi-chieu/${loanId}`}>Tải tài liệu bổ sung</Link>}
            </>} />
        )}
        <div className={`${styles.grid} ${readOnly ? styles.gridWide : ''}`} data-testid="loan-grid" data-readonly={readOnly}>
          <div className={styles.stack}>
            <AgentTeamPanel loanId={loanId} currency={loan.currency} status={loan.status} />
            {empties.length >= 2 && <EmptyBlocksNote labels={empties.filter((e) => e.key !== 'conditions' || ['APPROVED', 'APPROVED_WITH_CONDITIONS'].includes(loan.status)).map((e) => e.label)} />}
            {!isEmpty('metrics') && <MetricsPanel loanId={loanId} metrics={metrics} />}
            {!isEmpty('flags') && <FlagsPanel flags={flags} />}
            {!isEmpty('conditions') && <PreDisbursementPanel loanId={loanId} status={loan.status} decisionConditions={loan.conditions} confirmed={q.data.disbursement_conditions} />}
            <MemoPanel key={loan.status} loanId={loanId} />
            {loan.status === 'APPRAISAL' && actions.data?.can_write && <RelatedPartiesReview loanId={loanId} />}
            {!isEmpty('collaterals') && <CollateralPanel items={collaterals} />}
          </div>
          <aside className={`${styles.stack} ${readOnly ? styles.asideWide : ''}`} aria-label="Việc và hành động">
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
