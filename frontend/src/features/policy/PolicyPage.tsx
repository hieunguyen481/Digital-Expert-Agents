import { useQuery } from '@tanstack/react-query';
import { Input, Table } from 'antd';
import { useState } from 'react';
import { RequireRole } from '@/auth/RequireRole';
import type { UiRole } from '@/auth/roleFromMe';
import { PageHead } from '@/features/shell/PageHead';
import { StateBlock, StatusPill, ledgerTable } from '@/components/ui';
import apiClient from '@/services/apiClient';
import styles from './policy.module.css';

interface Policy { id: string; policy_code: string; policy_name: string; policy_type: string; status: string }
interface Clause { policy_version_id: string; clause_number: string; title: string | null; content: string; effective_from: string; effective_until: string | null }

const TYPE_LABEL: Record<string, string> = { CREDIT: 'Tín dụng', RISK: 'Rủi ro', COMPLIANCE: 'Tuân thủ', OPERATIONS: 'Vận hành' };
const STATUS_LABEL: Record<string, string> = { ACTIVE: 'Hiệu lực', DRAFT: 'Bản nháp', RETIRED: 'Hết hiệu lực', SUPERSEDED: 'Đã thay thế' };

/** Tra cứu chính sách: danh sách chính sách và tìm điều khoản theo từ khóa. */
const POLICY_ROLES: UiRole[] = ['qhkh', 'httd', 'tdinh', 'ruiro', 'pheduyet', 'kiemtoan', 'truongphong'];

/** Quản trị không có policy:read (ma trận phân quyền): báo "Không có quyền" như các trang khác. */
export default function PolicyPage() {
  return <RequireRole allow={POLICY_ROLES} pageName="Tra cứu chính sách"><PolicyContent /></RequireRole>;
}

function PolicyContent() {
  const [term, setTerm] = useState('');
  const [query, setQuery] = useState('');
  const list = useQuery<Policy[]>({ queryKey: ['policies'], queryFn: async () => (await apiClient.get<Policy[]>('/policies')).data });
  const found = useQuery<Clause[]>({
    queryKey: ['policy-search', query],
    enabled: query.length >= 2,
    queryFn: async () => (await apiClient.get<Clause[]>('/policies/search', { params: { query } })).data,
  });
  return (
    <>
      <PageHead title="Tra cứu chính sách" facts={['Tìm điều khoản trong chính sách cho vay hiện hành. Chỉ đọc.', list.data ? `${list.data.length} chính sách` : null]} />
      <div className={styles.page}>
        <div className={styles.card}>
          <label className={styles.searchLabel} htmlFor="policy-q">Từ khóa</label>
          <Input.Search
            id="policy-q" aria-label="Tìm điều khoản" placeholder="Ví dụ: DSCR, tài sản bảo đảm" allowClear enterButton="Tìm"
            value={term} onChange={(e) => { setTerm(e.target.value); if (!e.target.value) setQuery(''); }}
            onSearch={(v) => setQuery(v.trim())}
          />
        </div>
        {query.length >= 2 && (
          <section aria-label="Kết quả tìm kiếm" data-testid="policy-results" className={styles.results}>
            {found.isError && <div className={styles.card}><StateBlock kind="error" alert compact title="Không tìm được điều khoản" description="Thử lại sau ít phút." /></div>}
            {found.data?.length === 0 && (
              <div className={styles.card}>
                <StateBlock kind="empty" title="Không tìm thấy mục nào" description={`Không có điều khoản chứa “${query}”. Thử từ khóa ngắn hơn, ví dụ “DSCR”.`}
                  action={<button type="button" className={styles.linkBtn} onClick={() => { setTerm(''); setQuery(''); }}>Xóa từ khóa</button>} />
              </div>
            )}
            {!!found.data?.length && <p className={styles.count}>{found.data.length} kết quả cho “{query}”</p>}
            {found.data?.map((c) => (
              <article key={`${c.policy_version_id}-${c.clause_number}`} className={`${styles.card} ${styles.clause}`}>
                <h3><span className={styles.num}>Điều {c.clause_number}</span>{c.title ? <span>{c.title}</span> : null}</h3>
                <p>{c.content}</p>
                <small>Hiệu lực từ {new Date(c.effective_from).toLocaleDateString('vi-VN')}{c.effective_until ? ` đến ${new Date(c.effective_until).toLocaleDateString('vi-VN')}` : ''}</small>
              </article>
            ))}
          </section>
        )}
        {list.isError ? (
          <div className={styles.card}><StateBlock kind="error" alert title="Không tải được danh sách chính sách" description="Tải lại trang để thử lại." /></div>
        ) : (
        <section className={styles.card}>
        <h2 className={styles.h2}>Chính sách hiện hành</h2>
        <Table<Policy>
          className={ledgerTable} rowKey="id" loading={list.isLoading} pagination={false} aria-label="Danh sách chính sách" dataSource={list.data ?? []}
          columns={[
            { title: 'Mã', dataIndex: 'policy_code', render: (v: string) => <span className={styles.num}>{v}</span> },
            { title: 'Tên chính sách', dataIndex: 'policy_name' },
            { title: 'Loại', dataIndex: 'policy_type', render: (v: string) => TYPE_LABEL[v.toUpperCase()] ?? v },
            { title: 'Trạng thái', dataIndex: 'status', render: (v: string) => <StatusPill tone={v.toUpperCase() === 'ACTIVE' ? 'ok' : 'neutral'}>{STATUS_LABEL[v.toUpperCase()] ?? 'Không áp dụng'}</StatusPill> },
          ]}
        />
        </section>
        )}
      </div>
    </>
  );
}
