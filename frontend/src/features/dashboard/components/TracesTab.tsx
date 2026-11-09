import { useState } from 'react';
import { Alert, Button, Card, Empty, Skeleton, Tag, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/tables/DataTable';
import { listAgentCases, type AgentCaseSummary } from '@/services/agentCaseService';
import { formatDateTime } from '@/utils/formatDate';
import { STATE_COLOR, fmtSeconds, stateLabel } from '../agentTrace';
import { CaseTrace } from './CaseTrace';

const { Text } = Typography;

export function TracesTab({ initialCaseId = null }: { initialCaseId?: string | null }) {
  const [open, setOpen] = useState<string | null>(initialCaseId);
  const q = useQuery({ queryKey: ['agent-cases'], queryFn: () => listAgentCases(100), refetchInterval: 10_000 });

  if (q.isLoading) return <Skeleton active />;
  if (q.isError) {
    return (
      <Alert type="error" showIcon message="Không tải được danh sách case"
        action={<Button size="small" onClick={() => void q.refetch()}>Thử lại</Button>} />
    );
  }
  const cases = q.data ?? [];

  return (
    <Card title="Case phân tích gần đây" size="small"
      extra={<Text type="secondary" style={{ fontSize: 12 }}>{cases.length} case bạn được phép xem</Text>}>
      {cases.length === 0 ? (
        <Empty description="Chưa có case nào. Gửi một yêu cầu phân tích sâu ở trang trò chuyện, case sẽ hiện ở đây." />
      ) : (
        <DataTable<AgentCaseSummary>
          rowKey="case_id" dataSource={cases} size="small"
          onRow={(r) => ({ onClick: () => setOpen(r.case_id), style: { cursor: 'pointer' }, 'data-testid': `case-row-${r.case_id}` }) as React.HTMLAttributes<HTMLElement>}
          columns={[
            { title: 'Mã case', dataIndex: 'case_id', key: 'case_id', render: (id: string) => <Typography.Text code>{id}</Typography.Text> },
            {
              title: 'Yêu cầu', key: 'request',
              render: (_: unknown, r) => (
                <span>
                  {r.request.amount != null ? `${r.request.amount.toLocaleString('vi-VN')} VND` : '—'}
                  {r.request.term_months ? ` · ${r.request.term_months} tháng` : ''}
                  {r.request.purpose ? <Text type="secondary" style={{ display: 'block', fontSize: 11.5 }}>{r.request.purpose}</Text> : null}
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
