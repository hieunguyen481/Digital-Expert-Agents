import { useState } from 'react';
import { Alert, Button, Card, Empty, Input, Select, Skeleton, Tag, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/tables/DataTable';
import { listAgentCases, type AgentCaseSummary } from '@/services/agentCaseService';
import { formatDateTime } from '@/utils/formatDate';
import { STATE_COLOR, fmtSeconds, purposeLabel, stateLabel } from '../agentTrace';
import { CaseTrace } from './CaseTrace';

const { Text } = Typography;

export function TracesTab({ initialCaseId = null }: { initialCaseId?: string | null }) {
  const [open, setOpen] = useState<string | null>(initialCaseId);
  const [stateFilter, setStateFilter] = useState<string>();
  const [text, setText] = useState('');
  const q = useQuery({ queryKey: ['agent-cases'], queryFn: () => listAgentCases(200), refetchInterval: 10_000 });

  if (q.isLoading) return <Skeleton active />;
  if (q.isError) {
    return (
      <Alert type="error" showIcon message="Không tải được danh sách case"
        action={<Button size="small" onClick={() => void q.refetch()}>Thử lại</Button>} />
    );
  }
  const all = q.data ?? [];
  const needle = text.trim().toLowerCase();
  const cases = all.filter((c) => (!stateFilter || c.state === stateFilter)
    && (!needle || c.case_id.toLowerCase().includes(needle)
      || purposeLabel(c.request.purpose ?? '').toLowerCase().includes(needle)));
  const states = [...new Set(all.map((c) => c.state))].sort();

  return (
    <Card title="Case phân tích gần đây" size="small"
      extra={<Text type="secondary" style={{ fontSize: 12 }}>{cases.length === all.length ? `${all.length} case gần nhất bạn được phép xem` : `${cases.length}/${all.length} case gần nhất bạn được phép xem`}</Text>}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <Input.Search allowClear placeholder="Tìm theo mã case hoặc mục đích vay" style={{ width: 300 }}
          data-testid="trace-search" onChange={(e) => setText(e.target.value)} />
        <Select allowClear placeholder="Mọi trạng thái" style={{ width: 200 }} data-testid="trace-state-filter"
          value={stateFilter} onChange={setStateFilter}
          options={states.map((s) => ({ value: s, label: stateLabel(s) }))} />
      </div>
      {cases.length === 0 ? (
        <Empty description={all.length > 0 ? 'Không có case khớp bộ lọc.'
          : 'Chưa có case nào trong phạm vi của bạn. Case xuất hiện khi cán bộ có quyền chạy đội agent ở trang Hồ sơ vay hoặc gửi yêu cầu phân tích sâu ở trang trò chuyện.'} />
      ) : (
        <DataTable<AgentCaseSummary>
          rowKey="case_id" dataSource={cases} size="small" pagination={{ pageSize: 20, showSizeChanger: false }}
          onRow={(r) => ({ onClick: () => setOpen(r.case_id), style: { cursor: 'pointer' }, 'data-testid': `case-row-${r.case_id}` }) as React.HTMLAttributes<HTMLElement>}
          columns={[
            { title: 'Mã case', dataIndex: 'case_id', key: 'case_id', render: (id: string) => <Typography.Text code>{id}</Typography.Text> },
            {
              title: 'Yêu cầu', key: 'request',
              render: (_: unknown, r) => (
                <span>
                  {r.request.amount != null ? `${r.request.amount.toLocaleString('vi-VN')} VND` : '—'}
                  {r.request.term_months ? ` · ${r.request.term_months} tháng` : ''}
                  {r.request.purpose ? <Text type="secondary" style={{ display: 'block', fontSize: 11.5 }}>{purposeLabel(r.request.purpose)}</Text> : null}
                </span>
              ),
            },
            { title: 'Trạng thái', dataIndex: 'state', key: 'state', render: (s: string) => <Tag color={STATE_COLOR[s] ?? 'default'}>{stateLabel(s)}</Tag> },
            { title: 'Công cụ', dataIndex: 'tool_calls', key: 'tool_calls', align: 'right' },
            {
              title: 'Thời gian', key: 'dur', align: 'right',
              render: (_: unknown, r) => (r.updated_at > r.created_at ? fmtSeconds(r.updated_at - r.created_at) : '—'),
            },
            {
              title: 'Bắt đầu', dataIndex: 'created_at', key: 'created_at',
              render: (t: number) => <Text type="secondary" style={{ fontSize: 12 }}>{formatDateTime(new Date(t * 1000).toISOString())}</Text>,
            },
          ]}
        />
      )}
      <CaseTrace caseId={open} onClose={() => setOpen(null)} />
    </Card>
  );
}
