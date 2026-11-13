import { paginationItemRender } from '@/utils/paginationRender';
import { useQuery } from '@tanstack/react-query';
import { Input, Pagination, Skeleton, Table } from 'antd';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ActionButton, StateBlock, StatusPill, ledgerTable } from '@/components/ui';
import { PageHead } from '@/features/shell/PageHead';
import apiClient from '@/services/apiClient';
import { formatDate } from '@/utils/formatDate';
import { customerId, customerName, kycInfo, riskInfo, segmentLabel, type CustomerRow } from './customerFormat';
import styles from './customers.module.css';

const PAGE_SIZE = 20;

/** Danh sách khách hàng (mockup 18), dữ liệu thật từ GET /customers; backend giới hạn theo quyền xem. */
export default function CustomerListPage() {
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: ['customers', 'list', search, page],
    queryFn: async () => {
      const { data } = await apiClient.get<{ items: CustomerRow[]; meta: { total: number } }>('/customers', {
        params: { page, page_size: PAGE_SIZE, search: search || undefined },
      });
      return data;
    },
  });
  const total = q.data?.meta.total ?? 0;
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  return (
    <>
      <PageHead title="Khách hàng SME" facts={['Khách hàng trong phạm vi bạn được xem']} />
      <div className={styles.page}>
        <form
          className={`${styles.card} ${styles.search}`}
          aria-label="Tìm khách hàng"
          onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(draft.trim()); }}
        >
          <div className={styles.field}>
            <label htmlFor="kh-q">Tìm theo tên khách hàng</label>
            <Input id="kh-q" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ví dụ: Phúc Lâm" allowClear />
          </div>
          <ActionButton htmlType="submit">Tìm</ActionButton>
        </form>
        {q.isLoading && <Skeleton active />}
        {q.isError && (
          <StateBlock kind="error" title="Không tải được danh sách khách hàng" description="Thử lại sau ít phút." action={<ActionButton onClick={() => void q.refetch()}>Tải lại</ActionButton>} />
        )}
        {q.data && total === 0 && (
          <StateBlock kind="empty" title={search ? 'Không có khách hàng khớp' : 'Chưa có khách hàng'} description={search ? 'Thử tên khác hoặc xóa từ khóa.' : 'Khách hàng bạn được xem sẽ hiện ở đây.'} />
        )}
        {q.data && total > 0 && !q.data.items.some((r) => riskInfo(r.risk_rating)) && (
          <p className={styles.muted}>Chưa khách hàng nào trên trang này có xếp hạng rủi ro.</p>
        )}
        {q.data && total > 0 && (
          <section className={styles.card} aria-label="Danh sách khách hàng">
            <Table<CustomerRow>
              className={ledgerTable}
              rowKey={(r) => customerId(r) ?? r.customer_number}
              pagination={false}
              dataSource={q.data.items}
              aria-label="Khách hàng"
              columns={[
                { title: 'Khách hàng', render: (_, r) => { const id = customerId(r); return <span className={styles.name}>{id ? <Link to={`/customer/${id}`}>{customerName(r)}</Link> : customerName(r)}</span>; } },
                { title: 'Mã khách hàng', render: (_, r) => <span className={styles.id}>{r.customer_number}</span> },
                { title: 'Phân khúc', render: (_, r) => segmentLabel(r.customer_segment) ?? <span className={styles.muted}>Chưa có</span> },
                { title: 'Xác minh KYC', render: (_, r) => { const [l, t] = kycInfo(r.kyc_status); return <StatusPill tone={t}>{l}</StatusPill>; } },
                { title: 'Mức rủi ro', render: (_: unknown, r: CustomerRow) => { const k = riskInfo(r.risk_rating); return k ? <StatusPill tone={k[1]}>{k[0]}</StatusPill> : <span className={styles.muted} role="img" aria-label="Chưa xếp hạng">—</span>; } },
                { title: 'Cập nhật', render: (_, r) => <span className={styles.id}>{formatDate(r.updated_at)}</span> },
              ]}
            />
            <div className={styles.pager}>
              <span>Hiển thị {from} đến {to} trong {total} khách hàng</span>
              {total > PAGE_SIZE && <Pagination size="small" current={page} pageSize={PAGE_SIZE} total={total} showSizeChanger={false} onChange={setPage} itemRender={paginationItemRender} />}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
