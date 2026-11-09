import { Alert, Skeleton } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { PageError } from '@/components/common/PageError';
import { normalizeError } from '@/services/apiClient';
import { PageHead } from '@/features/shell/PageHead';
import { AgentTeamPanel } from './AgentTeamPanel';
import { ActionsPanel } from './ActionsPanel';
import { CollateralPanel, FlagsPanel, TimelinePanel } from './InfoPanels';
import { MemoPanel } from './MemoPanel';
import { MetricsPanel } from './MetricsPanel';
import { fetchOverview } from './loanDetailService';
import { fmtNum } from './format';
import { statusLabel } from '@/features/my-work/format';
import styles from './loan-detail.module.css';

export default function LoanDetailPage() {
  const { loanId = '' } = useParams();
  const q = useQuery({ queryKey: ['loan-overview', loanId], queryFn: () => fetchOverview(loanId) });
  if (q.isError) return <PageError title="Không tải được hồ sơ" error={normalizeError(q.error)} onRetry={() => void q.refetch()} />;
  if (!q.data) return <div className={styles.page} aria-busy><Skeleton active /></div>;
  const { loan, metrics, flags, collaterals, timeline, supplement_request } = q.data;
  return (
    <>
      <PageHead
        title={`Chi tiết hồ sơ vay · ${loan.customer_name ?? loan.application_number}`}
        facts={[loan.application_number, statusLabel(loan.status), `${fmtNum(Number(loan.requested_amount) / 1e9)} tỷ ${loan.currency}`,
          loan.requested_term_months ? `${loan.requested_term_months} tháng` : null,
          loan.approved_amount != null && Number(loan.approved_amount) > 0 ? `Số tiền được duyệt: ${fmtNum(Number(loan.approved_amount) / 1e9)} tỷ ${loan.currency}${loan.approved_term_months ? ` · ${loan.approved_term_months} tháng` : ''}` : null,
          loan.assignee_name ? `Đang giữ: ${loan.assignee_name}` : null]}
      />
      <div className={styles.page}>
        {supplement_request && (
          <Alert type="warning" showIcon data-testid="supplement-request" message="Hồ sơ đang chờ bổ sung"
            description={<>
              <div>{supplement_request.reason ?? 'Người xử lý chưa ghi nội dung cụ thể.'}</div>
              <div>Hạn bổ sung: {supplement_request.due_at ? new Date(supplement_request.due_at).toLocaleDateString('vi-VN') : '—'}</div>
              <Link to={`/doi-chieu/${loanId}`}>Tải tài liệu bổ sung</Link>
            </>} />
        )}
        <MetricsPanel loanId={loanId} metrics={metrics} />
        <div className={styles.grid}>
          <FlagsPanel flags={flags} />
          <TimelinePanel steps={timeline} />
        </div>
        <CollateralPanel items={collaterals} />
        <AgentTeamPanel loanId={loanId} currency={loan.currency} />
        <MemoPanel key={loan.status} loanId={loanId} />
        <ActionsPanel loanId={loanId} overview={q.data} />
      </div>
    </>
  );
}
