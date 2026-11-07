import { Skeleton } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { PageError } from '@/components/common/PageError';
import { normalizeError } from '@/services/apiClient';
import { PageHead } from '@/features/shell/PageHead';
import { CollateralPanel, FlagsPanel, TimelinePanel } from './InfoPanels';
import { MemoPanel } from './MemoPanel';
import { MetricsPanel } from './MetricsPanel';
import { fetchOverview } from './loanDetailService';
import { fmtNum } from './format';
import styles from './loan-detail.module.css';

export default function LoanDetailPage() {
  const { loanId = '' } = useParams();
  const q = useQuery({ queryKey: ['loan-overview', loanId], queryFn: () => fetchOverview(loanId) });
  if (q.isError) return <PageError title="Không tải được hồ sơ" error={normalizeError(q.error)} onRetry={() => void q.refetch()} />;
  if (!q.data) return <div className={styles.page} aria-busy><Skeleton active /></div>;
  const { loan, metrics, flags, collaterals, timeline } = q.data;
  return (
    <>
      <PageHead
        title={`Chi tiết hồ sơ vay · ${loan.customer_name ?? loan.application_number}`}
        facts={[loan.application_number, loan.status, `${fmtNum(Number(loan.requested_amount) / 1e9)} tỷ ${loan.currency}`,
          loan.requested_term_months ? `${loan.requested_term_months} tháng` : null, loan.assignee_name ? `Đang giữ: ${loan.assignee_name}` : null]}
      />
      <div className={styles.page}>
        <MetricsPanel loanId={loanId} metrics={metrics} />
        <div className={styles.grid}>
          <FlagsPanel flags={flags} />
          <TimelinePanel steps={timeline} />
        </div>
        <CollateralPanel items={collaterals} />
        <MemoPanel loanId={loanId} />
        <span className={styles.note}>Các hành động (Yêu cầu bổ sung, Trả lại, Trình Rủi ro, Báo sớm…) chưa hỗ trợ ở đợt này.</span>
      </div>
    </>
  );
}
