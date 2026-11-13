import { Button } from 'antd';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/tables/DataTable';
import { AgentTeam, AGENTS, KpiCard, StateBlock, StatusPill, ledgerNum, ledgerTable } from '@/components/ui';
import { fmtDec, fmtInt } from '@/utils/format';
import { TERM } from '@/utils/glossary';
import { getAgentCaseStats } from '@/services/agentCaseService';
import { STATE_TONE, agentName, fmtSeconds, stateLabel, toolLabel } from '../agentTrace';
import styles from '@/pages/AgentDashboardPage.module.css';

const ROLES = Object.fromEntries(AGENTS.map((a) => [a.key, a.role]));

/** Tổng quan: mọi số liệu tính từ trace thật trong Postgres, chỉ trên các lượt vai trò này được xem. */
/** Ô "Lượt tham gia": không để số 0 trơ trọi khi agent vẫn có công cụ hoặc lỗi; Planner là điều phối. */
export function participationNote(row: { agent: string; tasks: number; errors: number; tool_calls: number }): string | null {
  if (row.tasks > 0) return null;
  if (row.agent === 'planner') return 'điều phối';
  return row.errors + row.tool_calls > 0 ? 'chưa có tác vụ hoàn tất' : null;
}

export function OverviewTab() {
  const q = useQuery({ queryKey: ['agent-case-stats'], queryFn: getAgentCaseStats, refetchInterval: 10_000 });
  if (q.isLoading) return <PageSkeleton bare kpis={5} blocks={2} testId="overview-skeleton" />;
  if (q.isError) {
    return (
      <StateBlock kind="error" alert title="Không tải được số liệu tổng quan"
        description="Kiểm tra kết nối rồi thử lại."
        action={<Button onClick={() => void q.refetch()}>Thử lại</Button>} />
    );
  }
  const s = q.data;
  if (!s || s.cases === 0) {
    return (
      <StateBlock kind="empty" title="Chưa có lượt phân tích nào"
        description="Gửi một yêu cầu phân tích sâu ở trang Trợ lý AI, số liệu sẽ hiện ở đây." />
    );
  }

  const done = (s.by_state['Completed'] ?? 0) + (s.by_state['Pending Approval'] ?? 0);
  const pct = s.cases > 0 ? ` (${fmtDec((done / s.cases) * 100, 1)}%)` : '';
  const avg = s.avg_seconds != null ? fmtSeconds(s.avg_seconds).split(' ') : null;

  const tiles = 3 + (avg ? 1 : 0) + (s.cost_usd != null ? 1 : 0);

  return (
    <div className={styles.stack} data-testid="overview">
      <div className={styles.kpiGrid} style={{ gridTemplateColumns: `1.3fr repeat(${tiles}, minmax(0, 1fr))` }}>
        <KpiCard hero label="Đã có kết luận" value={fmtInt(done)} note={`trên ${fmtInt(s.cases)} lượt${pct}`} />
        <KpiCard label={TERM.totalRuns} value={fmtInt(s.cases)} note="lượt" />
        <KpiCard label={TERM.toolCalls} value={fmtInt(s.tool_calls)} note="lần" />
        <KpiCard label={TERM.challenge} value={fmtInt(s.challenges)} note="lần" />
        {avg && <KpiCard label="Thời gian trung bình" value={avg[0]} note={avg[1]} />}
        {s.cost_usd != null && <KpiCard label="Chi phí LLM" value={fmtDec(s.cost_usd, 2)} note={`USD, ${fmtInt(s.llm_calls)} lượt gọi`} />}
      </div>

      <section className={styles.card} aria-labelledby="ov-flow">
        <div className={styles.cardHead}><h2 id="ov-flow">Mỗi lượt chạy theo sơ đồ này</h2></div>
        <div className={styles.cardBody}>
          <AgentTeam variant="strip" notes={ROLES} />
          <p className={styles.muted}>Quyết định cuối cùng do Cấp phê duyệt ghi ở trang Hồ sơ vay, không thuộc lượt chạy.</p>
        </div>
      </section>

      <section className={styles.card} aria-labelledby="ov-state">
        <div className={styles.cardHead}><h2 id="ov-state">Trạng thái các lượt phân tích</h2><span className={styles.cardNote}>Tổng {fmtInt(s.cases)} lượt</span></div>
        <div className={styles.cardBody}>
          <div className={styles.pills}>
            {Object.entries(s.by_state).map(([st, n]) => (
              <span key={st} className={styles.pillItem}>
                <StatusPill tone={STATE_TONE[st] ?? 'neutral'}>{stateLabel(st)}</StatusPill>
                <b>{fmtInt(n)}</b>
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.card} aria-labelledby="ov-agent">
        <div className={styles.cardHead}><h2 id="ov-agent">Theo từng agent</h2></div>
        <div className={`${styles.cardBody} ${styles.flush}`}>
          <DataTable<(typeof s.agents)[number]> rowKey="agent" dataSource={s.agents.filter((a) => a.tasks + a.errors + a.tool_calls > 0 || a.agent === 'planner')} size="small" className={ledgerTable}
            emptyTitle="Chưa có tác vụ nào hoàn tất"
            columns={[
              { title: 'Agent', dataIndex: 'agent', key: 'agent', render: (a: string) => <b>{agentName(a)}</b> },
              { title: 'Lượt tham gia', dataIndex: 'tasks', key: 'tasks', align: 'right', className: ledgerNum, render: (n: number, row) => {
                const note = participationNote(row);
                return note ? <span className={styles.cellNote} data-testid="cell-note">{note}</span> : fmtInt(n);
              } },
              { title: 'Lỗi', dataIndex: 'errors', key: 'errors', align: 'right', className: ledgerNum, render: (n: number) => fmtInt(n) },
              { title: 'Công cụ gọi', dataIndex: 'tool_calls', key: 'tool_calls', align: 'right', className: ledgerNum, render: (n: number) => fmtInt(n) },
            ]}
          />
          <p className={styles.muted} style={{ padding: '8px 16px' }}>Planner điều phối nên không nhận việc riêng. Số lượt tham gia của mỗi agent là số tác vụ nó đã xử lý; “chưa có tác vụ hoàn tất” nghĩa là agent đã gọi công cụ hoặc gặp lỗi nhưng chưa có tác vụ nào xong.{s.agents.some((a) => a.agent === 'document' && a.tasks === 0 && a.errors > 0) && ' Lỗi của Document là lỗi đọc tài liệu khi hồ sơ không có tệp.'}</p>
        </div>
      </section>

      {s.tools.length > 0 && (
        <section className={styles.card} aria-labelledby="ov-tool">
          <div className={styles.cardHead}><h2 id="ov-tool">Công cụ MCP đã gọi</h2></div>
          <div className={`${styles.cardBody} ${styles.flush}`}>
            <DataTable<(typeof s.tools)[number]> rowKey="tool" dataSource={s.tools} size="small" className={ledgerTable}
              columns={[
                { title: 'Công cụ', dataIndex: 'tool', key: 'tool', render: (t: string) => <span title={t}>{toolLabel(t)}</span> },
                { title: 'Số lần', dataIndex: 'n', key: 'n', align: 'right', className: ledgerNum, render: (n: number) => fmtInt(n) },
                { title: 'Không thành công', dataIndex: 'failed', key: 'failed', align: 'right', className: ledgerNum, render: (n: number) => fmtInt(n) },
              ]}
            />
          </div>
        </section>
      )}
    </div>
  );
}
