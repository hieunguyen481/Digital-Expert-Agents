import { Alert, Skeleton, Table } from 'antd';
import { Link } from 'react-router-dom';
import { RequireRole } from '@/auth/RequireRole';
import { StateBlock, StatusPill, ledgerTable } from '@/components/ui';
import { PageHead } from '@/features/shell/PageHead';
import { useWorkItems } from '@/features/my-work/useWorkItems';
import { customerLabel, slaText, stepLabel, workdaysBetween } from '@/features/my-work/format';
import type { WorkItem } from '@/features/my-work/types';
import { fmtDay } from '@/utils/format';
import styles from './reconciliation.module.css';

/** Điểm vào từ thanh điều hướng: chọn một hồ sơ đang ở bước của mình. */
export default function ReconciliationIndexPage() {
  const q = useWorkItems('all');
  return (
    <RequireRole allow={['httd', 'tdinh']} pageName="Đối chiếu tài liệu">
      <PageHead title="Đối chiếu tài liệu" facts={[q.data ? `${q.data.items.length} hồ sơ cần đối chiếu` : 'Đang tải', 'Sắp theo hạn gần nhất']} />
      <div className={styles.page}>
        {q.isError && <Alert type="error" showIcon message="Không tải được danh sách hồ sơ" />}
        {q.data && q.data.items.length === 0 && (
          <StateBlock kind="empty" title="Chưa có hồ sơ cần đối chiếu" description="Khi hồ sơ chuyển tới bước của bạn, hồ sơ sẽ hiện ở đây." />
        )}
        {!q.data && !q.isError && <Skeleton active />}
        {q.data && q.data.items.length > 0 && (
          <div className={styles.tableCard}>
          <Table<WorkItem>
            className={ledgerTable} rowKey="loan_application_id" pagination={false} aria-label="Hồ sơ cần đối chiếu"
            dataSource={[...q.data.items].sort((a, b) => (a.due_at ?? '9').localeCompare(b.due_at ?? '9'))}
            columns={[
              { title: 'Hồ sơ', render: (_, r) => <Link className={styles.ledgerLink} to={`/doi-chieu/${r.loan_application_id}`}>{r.application_number}</Link> },
              { title: 'Khách hàng', render: (_, r) => customerLabel(r.customer_name) },
              { title: 'Bước', render: (_, r) => stepLabel(r.step_code) },
              { title: 'Hạn', render: (_, r) => {
                if (!r.due_at) return <span className={styles.note}>Không đặt hạn</span>;
                // Một ngưỡng chung theo số ngày làm việc còn lại, không theo SLA riêng từng hồ sơ.
                const n = workdaysBetween(new Date(), new Date(r.due_at));
                return <StatusPill tone={r.paused || r.sla_level === 'pause' ? 'neutral' : n < 0 ? 'bad' : n <= 1 ? 'warn' : 'ok'}>{fmtDay(r.due_at)} · {slaText({ ...r, sla_level: n < 0 ? 'over' : n === 0 ? 'today' : 'ok' }, new Date())}</StatusPill>;
              } },
            ]}
          />
          </div>
        )}
      </div>
    </RequireRole>
  );
}
