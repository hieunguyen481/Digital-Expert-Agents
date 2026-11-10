import { useQuery } from '@tanstack/react-query';
import { Alert, Button, DatePicker, Input, Table } from 'antd';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RequireRole } from '@/auth/RequireRole';
import { PageHead } from '@/features/shell/PageHead';
import apiClient from '@/services/apiClient';
import styles from './audit.module.css';

interface AuditEvent {
  id: string;
  event_time: string;
  actor_name?: string | null;
  actor_type: string;
  action: string;
  resource_type: string;
  result: string;
  loan_application_id: string | null;
  loan_application_number?: string | null;
}
interface AuditList {
  items: AuditEvent[];
  meta: { total: number; page: number; page_size: number };
}
interface Filters {
  loan_number: string;
  action: string;
  actor_name: string;
  date_from: string;
  date_to: string;
}
const EMPTY: Filters = { loan_number: '', action: '', actor_name: '', date_from: '', date_to: '' };
const PAGE_SIZE = 50;

/** Nhật ký kiểm toán (chỉ đọc): lọc theo hồ sơ, hành động, người thao tác, ngày. */
export default function AuditLogPage() {
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const q = useQuery<AuditList>({
    queryKey: ['audit-events', applied, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, page_size: PAGE_SIZE };
      for (const [k, v] of Object.entries(applied)) if (v) params[k] = v;
      return (await apiClient.get<AuditList>('/audit-events', { params })).data;
    },
  });
  const apply = () => { setPage(1); setApplied(draft); };
  return (
    <RequireRole allow={['kiemtoan']} pageName="Nhật ký kiểm toán">
      <PageHead title="Nhật ký kiểm toán" facts={['Chỉ đọc', q.data ? `${q.data.items.length} dòng trên trang` : null]} />
      <div className={styles.page}>
        <form className={styles.filters} onSubmit={(e) => { e.preventDefault(); apply(); }} aria-label="Bộ lọc nhật ký">
          <Input aria-label="Số hồ sơ" placeholder="Số hồ sơ (LA-…)" value={draft.loan_number} onChange={(e) => setDraft({ ...draft, loan_number: e.target.value })} />
          <Input aria-label="Hành động" placeholder="Hành động (WORKFLOW_…)" value={draft.action} onChange={(e) => setDraft({ ...draft, action: e.target.value })} />
          <Input aria-label="Người thao tác" placeholder="Người thao tác" value={draft.actor_name} onChange={(e) => setDraft({ ...draft, actor_name: e.target.value })} />
          <DatePicker aria-label="Từ ngày" placeholder="Từ ngày" format="DD/MM/YYYY" onChange={(d) => setDraft({ ...draft, date_from: d ? d.format('YYYY-MM-DD') : '' })} />
          <DatePicker aria-label="Đến ngày" placeholder="Đến ngày" format="DD/MM/YYYY" onChange={(d) => setDraft({ ...draft, date_to: d ? d.format('YYYY-MM-DD') : '' })} />
          <Button type="primary" htmlType="submit">Lọc</Button>
        </form>
        {q.isError && <Alert type="error" showIcon message="Không tải được nhật ký kiểm toán" />}
        <Table<AuditEvent>
          rowKey="id" loading={q.isLoading} aria-label="Nhật ký kiểm toán" dataSource={q.data?.items ?? []}
          pagination={{ current: page, pageSize: PAGE_SIZE, total: q.data?.meta.total, showSizeChanger: false, onChange: setPage }}
          columns={[
            { title: 'Thời gian', dataIndex: 'event_time', render: (v: string) => new Date(v).toLocaleString('vi-VN') },
            { title: 'Người thao tác', render: (_, r) => r.actor_name ?? r.actor_type },
            { title: 'Hành động', dataIndex: 'action' },
            { title: 'Đối tượng', dataIndex: 'resource_type' },
            { title: 'Hồ sơ', render: (_, r) => r.loan_application_id ? <Link to={`/ho-so-vay/${r.loan_application_id}`}>{r.loan_application_number ?? 'Mở hồ sơ'}</Link> : '—' },
            { title: 'Kết quả', dataIndex: 'result' },
          ]}
        />
      </div>
    </RequireRole>
  );
}
