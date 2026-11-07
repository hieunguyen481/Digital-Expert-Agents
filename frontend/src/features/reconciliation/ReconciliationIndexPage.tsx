import { Alert, Skeleton, Table } from 'antd';
import { Link } from 'react-router-dom';
import { RequireRole } from '@/auth/RequireRole';
import { PageHead } from '@/features/shell/PageHead';
import { useWorkItems } from '@/features/my-work/useWorkItems';
import type { WorkItem } from '@/features/my-work/types';
import styles from './reconciliation.module.css';

/** Điểm vào từ thanh điều hướng: chọn một hồ sơ đang ở bước của mình. */
export default function ReconciliationIndexPage() {
  const q = useWorkItems('all');
  return (
    <RequireRole allow={['httd', 'tdinh']} pageName="Đối chiếu tài liệu">
      <PageHead title="Đối chiếu tài liệu" facts={['Chọn hồ sơ']} />
      <div className={styles.page}>
        {q.isError && <Alert type="error" showIcon message="Không tải được danh sách hồ sơ" />}
        {!q.data && !q.isError && <Skeleton active />}
        {q.data && (
          <Table<WorkItem>
            rowKey="loan_application_id" pagination={false} aria-label="Hồ sơ cần đối chiếu"
            dataSource={q.data.items}
            columns={[
              { title: 'Hồ sơ', render: (_, r) => <Link to={`/doi-chieu/${r.loan_application_id}`}>{r.application_number}</Link> },
              { title: 'Khách hàng', dataIndex: 'customer_name' },
              { title: 'Bước', dataIndex: 'step_code' },
            ]}
          />
        )}
      </div>
    </RequireRole>
  );
}
