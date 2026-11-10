import { useQuery } from '@tanstack/react-query';
import { Alert, Empty, Input, Table, Tag } from 'antd';
import { useState } from 'react';
import { PageHead } from '@/features/shell/PageHead';
import apiClient from '@/services/apiClient';
import styles from './policy.module.css';

interface Policy { id: string; policy_code: string; policy_name: string; policy_type: string; status: string }
interface Clause { policy_version_id: string; clause_number: string; title: string | null; content: string; effective_from: string; effective_until: string | null }

/** Tra cứu chính sách: danh sách chính sách và tìm điều khoản theo từ khóa. */
export default function PolicyPage() {
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
      <PageHead title="Tra cứu chính sách" facts={['Chỉ đọc', list.data ? `${list.data.length} chính sách` : null]} />
      <div className={styles.page}>
        <Input.Search
          aria-label="Tìm điều khoản" placeholder="Tìm điều khoản (ví dụ: DSCR, tài sản bảo đảm)…" allowClear enterButton="Tìm"
          value={term} onChange={(e) => { setTerm(e.target.value); if (!e.target.value) setQuery(''); }}
          onSearch={(v) => setQuery(v.trim())}
        />
        {query.length >= 2 && (
          <section aria-label="Kết quả tìm kiếm" data-testid="policy-results">
            {found.isError && <Alert type="error" showIcon message="Không tìm được điều khoản" />}
            {found.data?.length === 0 && <Empty description={`Không có điều khoản khớp “${query}”`} />}
            {found.data?.map((c) => (
              <article key={`${c.policy_version_id}-${c.clause_number}`} className={styles.clause}>
                <b>Điều {c.clause_number}{c.title ? ` · ${c.title}` : ''}</b>
                <p>{c.content}</p>
                <small>Hiệu lực từ {new Date(c.effective_from).toLocaleDateString('vi-VN')}{c.effective_until ? ` đến ${new Date(c.effective_until).toLocaleDateString('vi-VN')}` : ''}</small>
              </article>
            ))}
          </section>
        )}
        {list.isError && <Alert type="error" showIcon message="Không tải được danh sách chính sách" />}
        <Table<Policy>
          rowKey="id" loading={list.isLoading} pagination={false} aria-label="Danh sách chính sách" dataSource={list.data ?? []}
          columns={[
            { title: 'Mã', dataIndex: 'policy_code' },
            { title: 'Tên chính sách', dataIndex: 'policy_name' },
            { title: 'Loại', dataIndex: 'policy_type' },
            { title: 'Trạng thái', dataIndex: 'status', render: (v: string) => <Tag>{v}</Tag> },
          ]}
        />
      </div>
    </>
  );
}
