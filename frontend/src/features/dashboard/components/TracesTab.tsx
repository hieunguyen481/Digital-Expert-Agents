import { paginationItemRender } from '@/utils/paginationRender';
import { useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Button, Checkbox, Input, Select, Skeleton } from 'antd';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/tables/DataTable';
import { listAgentCases, type AgentCaseSummary } from '@/services/agentCaseService';
import { fmtDayTime, fmtInt } from '@/utils/format';
import { StateBlock, StatusPill, ledgerNum, ledgerTable } from '@/components/ui';
import { STATE_TONE, fmtSeconds, isTestCase, purposeLabel, stateLabel } from '../agentTrace';
import { CaseTrace } from './CaseTrace';
import styles from '@/pages/AgentDashboardPage.module.css';


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
      <StateBlock kind="error" alert title="Không tải được danh sách lượt phân tích"
        description="Kiểm tra kết nối rồi thử lại."
        action={<Button onClick={() => void q.refetch()}>Thử lại</Button>} />
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
    <section className={styles.card} aria-labelledby="tr-h">
      <div className={styles.cardHead}>
        <h2 id="tr-h">Lượt phân tích gần đây</h2>
        <span className={styles.cardNote}>{cases.length === all.length ? `${fmtInt(all.length)} lượt gần nhất bạn được phép xem` : `${fmtInt(cases.length)}/${fmtInt(all.length)} lượt gần nhất bạn được phép xem`}</span>
      </div>
      <p className={styles.scopeNote}>Tổng quan đếm toàn hệ thống; ở đây bạn chỉ xem được lượt trên hồ sơ trong phạm vi của mình.</p>
      <div className={styles.filters}>
        <Input.Search allowClear aria-label="Tìm lượt phân tích" placeholder="Tìm theo khách hàng, mã hồ sơ, mã lượt hoặc mục đích vay"
          enterButton={<Button aria-label="Tìm" icon={<SearchOutlined />} />} data-testid="trace-search" onChange={(e) => setText(e.target.value)} />
        <Select allowClear aria-label="Lọc theo trạng thái" placeholder="Mọi trạng thái" style={{ width: 200 }} data-testid="trace-state-filter"
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
        <StateBlock kind="empty" compact
          title={all.length > 0 ? 'Không có lượt phân tích khớp bộ lọc' : 'Chưa có lượt phân tích nào trong phạm vi của bạn'}
          description={all.length > 0 ? 'Bỏ bớt bộ lọc hoặc đổi từ khóa tìm kiếm.'
            : 'Lượt phân tích xuất hiện khi cán bộ có quyền chạy đội agent ở trang Hồ sơ vay hoặc gửi yêu cầu phân tích sâu ở trang Trợ lý AI.'} />
      ) : (
        <DataTable<AgentCaseSummary>
          rowKey="case_id" dataSource={cases} size="small" className={ledgerTable} pagination={{ pageSize: 20, showSizeChanger: false, itemRender: paginationItemRender }}
          onRow={(r) => ({
            onClick: () => setOpen(r.case_id), className: styles.rowClick, 'data-testid': `case-row-${r.case_id}`,
            tabIndex: 0,
            onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(r.case_id); } },
          }) as React.HTMLAttributes<HTMLElement>}
          columns={[
            {
              title: 'Khách hàng', key: 'customer',
              render: (_: unknown, r) => (
                <span>
                  {r.customer_name ? <b>{r.customer_name}</b> : <span className={styles.sub}>Chưa gắn hồ sơ</span>}
                </span>
              ),
            },
            {
              title: 'Hồ sơ vay', key: 'loan',
              render: (_: unknown, r) => (r.loan_id && r.application_number
                ? <Link to={`/ho-so-vay/${r.loan_id}`} onClick={(e) => e.stopPropagation()}>{r.application_number}</Link>
                : <span className={styles.sub}>Không gắn hồ sơ</span>),
            },
            {
              title: 'Yêu cầu', key: 'request',
              render: (_: unknown, r) => (
                <span>
                  {r.request.amount != null ? `${fmtInt(r.request.amount)} đồng` : '—'}
                  {r.request.term_months ? `, ${r.request.term_months} tháng` : ''}
                  {r.request.purpose ? <span className={styles.sub}>{purposeLabel(r.request.purpose)}</span> : null}
                </span>
              ),
            },
            { title: 'Trạng thái', dataIndex: 'state', key: 'state', render: (s: string) => <StatusPill tone={STATE_TONE[s] ?? 'neutral'}>{stateLabel(s)}</StatusPill> },
            { title: 'Công cụ', dataIndex: 'tool_calls', key: 'tool_calls', align: 'right', className: ledgerNum, render: (n: number) => fmtInt(n) },
            {
              title: 'Thời gian', key: 'dur', align: 'right', className: ledgerNum,
              render: (_: unknown, r) => (r.updated_at > r.created_at ? fmtSeconds(r.updated_at - r.created_at) : '—'),
            },
            {
              title: 'Bắt đầu', dataIndex: 'created_at', key: 'created_at',
              render: (t: number) => <span className={styles.sub}>{fmtDayTime(t)}</span>,
            },
          ]}
        />
      )}
      <CaseTrace caseId={open} onClose={() => setOpen(null)} />
    </section>
  );
}
