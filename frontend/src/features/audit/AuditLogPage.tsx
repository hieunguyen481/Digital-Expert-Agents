import { useQuery } from '@tanstack/react-query';
import { Button, DatePicker, Input, Select, Table } from 'antd';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RequireRole } from '@/auth/RequireRole';
import { PageHead } from '@/features/shell/PageHead';
import { StateBlock, StatusPill, ledgerTable } from '@/components/ui';
import apiClient from '@/services/apiClient';
import styles from './audit.module.css';
import { ACTION_LABELS, RESOURCE_LABELS, RESULT_LABELS, actionLabel } from './labels';

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
      <PageHead title="Nhật ký kiểm toán" facts={['Chỉ đọc. Mỗi dòng ghi một hành động, không sửa, không xóa.', q.data ? `${q.data.meta.total} dòng, ${q.data.items.length} dòng trên trang này` : null]} />
      <div className={styles.page}>
        <form className={`${styles.card} ${styles.filters}`} onSubmit={(e) => { e.preventDefault(); apply(); }} aria-label="Bộ lọc nhật ký">
          <label className={styles.field}><span>Số hồ sơ</span>
            <Input aria-label="Số hồ sơ" placeholder="LA-…" value={draft.loan_number} onChange={(e) => setDraft({ ...draft, loan_number: e.target.value })} /></label>
          <label className={styles.field}><span>Hành động</span>
            <Select aria-label="Hành động" placeholder="Tất cả" allowClear showSearch optionFilterProp="label" value={draft.action || undefined}
              options={Object.entries(ACTION_LABELS).map(([code, label]) => ({ value: code, label }))}
              onChange={(v) => setDraft({ ...draft, action: v ?? '' })} /></label>
          <label className={styles.field}><span>Người thao tác</span>
            <Input aria-label="Người thao tác" placeholder="Tên người hoặc agent" value={draft.actor_name} onChange={(e) => setDraft({ ...draft, actor_name: e.target.value })} /></label>
          <label className={styles.field}><span>Từ ngày</span>
            <DatePicker aria-label="Từ ngày" placeholder="ngày/tháng/năm" format="DD/MM/YYYY" onChange={(d) => setDraft({ ...draft, date_from: d ? d.format('YYYY-MM-DD') : '' })} /></label>
          <label className={styles.field}><span>Đến ngày</span>
            <DatePicker aria-label="Đến ngày" placeholder="ngày/tháng/năm" format="DD/MM/YYYY" onChange={(d) => setDraft({ ...draft, date_to: d ? d.format('YYYY-MM-DD') : '' })} /></label>
          <Button type="primary" htmlType="submit">Lọc</Button>
        </form>
        {q.isError ? (
          <div className={styles.card}><StateBlock kind="error" alert title="Không tải được nhật ký kiểm toán" description="Kiểm tra kết nối rồi bấm Lọc để thử lại." /></div>
        ) : (
        <section className={styles.card}>
        <Table<AuditEvent>
          className={ledgerTable} rowKey="id" loading={q.isLoading} aria-label="Nhật ký kiểm toán" dataSource={q.data?.items ?? []}
          locale={{ emptyText: <StateBlock kind="empty" compact title="Không có dòng nào khớp" description="Bỏ bớt điều kiện lọc hoặc mở rộng khoảng ngày." /> }}
          pagination={{ current: page, pageSize: PAGE_SIZE, total: q.data?.meta.total, showSizeChanger: false, onChange: setPage }}
          columns={[
            { title: 'Thời gian', dataIndex: 'event_time', render: (v: string) => <span className={styles.time}>{new Date(v).toLocaleString('vi-VN')}</span> },
            { title: 'Nguồn', dataIndex: 'actor_type', render: (v: string) => {
              const t = v.toUpperCase();
              if (t === 'AGENT') return <StatusPill tone="ai">AI đề xuất</StatusPill>;
              if (t === 'SYSTEM') return <StatusPill tone="neutral">Hệ thống</StatusPill>;
              if (t === 'CUSTOMER') return <StatusPill tone="neutral">Khách hàng</StatusPill>;
              return <StatusPill tone="neutral">Người</StatusPill>;
            } },
            { title: 'Người thao tác', render: (_, r) => r.actor_name ?? (r.actor_type.toUpperCase() === 'AGENT' ? 'Đội agent' : '—') },
            { title: 'Hành động', dataIndex: 'action', render: (v: string) => actionLabel(v) },
            { title: 'Đối tượng', dataIndex: 'resource_type', render: (v: string) => RESOURCE_LABELS[v] ?? v },
            { title: 'Hồ sơ', render: (_, r) => r.loan_application_id ? <Link to={`/ho-so-vay/${r.loan_application_id}`}>{r.loan_application_number ?? 'Mở hồ sơ'}</Link> : '—' },
            { title: 'Kết quả', dataIndex: 'result', render: (v: string) => RESULT_LABELS[v] ?? v },
          ]}
        />
        </section>
        )}
      </div>
    </RequireRole>
  );
}
