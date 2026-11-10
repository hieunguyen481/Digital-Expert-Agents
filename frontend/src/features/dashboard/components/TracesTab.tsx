import { useState } from 'react';
import { Alert, Button, Card, Checkbox, Empty, Input, Select, Skeleton, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/tables/DataTable';
import { listAgentCases, type AgentCaseSummary } from '@/services/agentCaseService';
import { fmtDayTime, fmtInt } from '@/utils/format';
import { STATE_COLOR, fmtSeconds, isTestCase, purposeLabel, stateLabel } from '../agentTrace';
import { CaseTrace } from './CaseTrace';

const { Text } = Typography;

export function TracesTab({ initialCaseId = null }: { initialCaseId?: string | null }) {
  const [open, setOpen] = useState<string | null>(initialCaseId);
  const [stateFilter, setStateFilter] = useState<string>();
  const [text, setText] = useState('');
  const [showEmpty, setShowEmpty] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const q = useQuery({ queryKey: ['agent-cases'], queryFn: () => listAgentCases(200), refetchInterval: 10_000 });

  if (q.isLoading) return <Skeleton active />;
  if (q.isError) {
    return (
      <Alert type="error" showIcon message="Không tải được danh sách lượt phân tích"
        action={<Button size="small" onClick={() => void q.refetch()}>Thử lại</Button>} />
    );
  }
  const raw = q.data ?? [];
  // Lượt nháp chưa gọi công cụ nào là rác kiểm thử/bấm nhầm: ẩn mặc định, không xóa dữ liệu.
  const isEmptyDraft = (c: AgentCaseSummary) => c.state === 'Draft' && c.tool_calls === 0;
  const hidden = raw.filter(isEmptyDraft).length;
  // Mặc định chỉ hiện ca của hồ sơ thật và ca demo; ca kiểm thử (e2e, benchmark, trò chuyện không gắn hồ sơ) ẩn sau bộ lọc.
  const hiddenTest = raw.filter(isTestCase).length;
  const all = raw.filter((c) => (showEmpty || !isEmptyDraft(c)) && (showTest || !isTestCase(c)));
  const needle = text.trim().toLowerCase();
  const cases = all.filter((c) => (!stateFilter || c.state === stateFilter)
    && (!needle || c.case_id.toLowerCase().includes(needle)
      || (c.customer_name ?? '').toLowerCase().includes(needle)
      || (c.application_number ?? '').toLowerCase().includes(needle)
      || purposeLabel(c.request.purpose ?? '').toLowerCase().includes(needle)));
  const states = [...new Set(all.map((c) => c.state))].sort();

  return (
    <Card title="Lượt phân tích gần đây" size="small"
      extra={<Text type="secondary" style={{ fontSize: 12 }}>{cases.length === all.length ? `${fmtInt(all.length)} lượt gần nhất bạn được phép xem` : `${fmtInt(cases.length)}/${fmtInt(all.length)} lượt gần nhất bạn được phép xem`}</Text>}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <Input.Search allowClear placeholder="Tìm theo khách hàng, mã hồ sơ, mã lượt hoặc mục đích vay" style={{ width: 380 }}
          data-testid="trace-search" onChange={(e) => setText(e.target.value)} />
        <Select allowClear placeholder="Mọi trạng thái" style={{ width: 200 }} data-testid="trace-state-filter"
          value={stateFilter} onChange={setStateFilter}
          options={states.map((s) => ({ value: s, label: stateLabel(s) }))} />
        {hiddenTest > 0 && (
          <Checkbox checked={showTest} onChange={(e) => setShowTest(e.target.checked)} data-testid="trace-show-test">
            Hiện ca kiểm thử ({fmtInt(hiddenTest)})
          </Checkbox>
        )}
        {hidden > 0 && (
          <Checkbox checked={showEmpty} onChange={(e) => setShowEmpty(e.target.checked)} data-testid="trace-show-empty">
            Hiện {fmtInt(hidden)} lượt nháp chưa gọi công cụ
          </Checkbox>
        )}
      </div>
      {cases.length === 0 ? (
        <Empty description={all.length > 0 ? 'Không có lượt phân tích khớp bộ lọc.'
          : 'Chưa có lượt phân tích nào trong phạm vi của bạn. Lượt phân tích xuất hiện khi cán bộ có quyền chạy đội agent ở trang Hồ sơ vay hoặc gửi yêu cầu phân tích sâu ở trang trò chuyện.'} />
      ) : (
        <DataTable<AgentCaseSummary>
          rowKey="case_id" dataSource={cases} size="small" pagination={{ pageSize: 20, showSizeChanger: false }}
          onRow={(r) => ({ onClick: () => setOpen(r.case_id), style: { cursor: 'pointer' }, 'data-testid': `case-row-${r.case_id}` }) as React.HTMLAttributes<HTMLElement>}
          columns={[
            {
              title: 'Khách hàng', key: 'customer',
              render: (_: unknown, r) => (r.customer_name ? <b>{r.customer_name}</b> : <Text type="secondary">Chưa gắn hồ sơ</Text>),
            },
            {
              title: 'Hồ sơ vay', key: 'loan',
              render: (_: unknown, r) => (r.loan_id && r.application_number
                ? <Link to={`/ho-so-vay/${r.loan_id}`} onClick={(e) => e.stopPropagation()}>{r.application_number}</Link> : '—'),
            },
            { title: 'Mã lượt', dataIndex: 'case_id', key: 'case_id', render: (id: string) => <Typography.Text code style={{ fontSize: 11 }}>{id}</Typography.Text> },
            {
              title: 'Yêu cầu', key: 'request',
              render: (_: unknown, r) => (
                <span>
                  {r.request.amount != null ? `${fmtInt(r.request.amount)} VND` : '—'}
                  {r.request.term_months ? ` · ${r.request.term_months} tháng` : ''}
                  {r.request.purpose ? <Text type="secondary" style={{ display: 'block', fontSize: 11.5 }}>{purposeLabel(r.request.purpose)}</Text> : null}
                </span>
              ),
            },
            { title: 'Trạng thái', dataIndex: 'state', key: 'state', render: (s: string) => <Tag color={STATE_COLOR[s] ?? 'default'}>{stateLabel(s)}</Tag> },
            { title: 'Công cụ', dataIndex: 'tool_calls', key: 'tool_calls', align: 'right', render: (n: number) => fmtInt(n) },
            {
              title: 'Thời gian', key: 'dur', align: 'right',
              render: (_: unknown, r) => (r.updated_at > r.created_at ? fmtSeconds(r.updated_at - r.created_at) : '—'),
            },
            {
              title: 'Bắt đầu', dataIndex: 'created_at', key: 'created_at',
              render: (t: number) => <Text type="secondary" style={{ fontSize: 12 }}>{fmtDayTime(t)}</Text>,
            },
          ]}
        />
      )}
      <CaseTrace caseId={open} onClose={() => setOpen(null)} />
    </Card>
  );
}
