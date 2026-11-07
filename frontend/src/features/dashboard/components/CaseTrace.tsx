import { useEffect, useMemo, useState } from 'react';
import { Alert, Drawer, Empty, Skeleton, Tag, Typography } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAgentCase, getAgentCaseEvents, streamAgentCase, type AgentCaseEvent } from '@/services/agentCaseService';
import {
  DECISION_LABEL, STATE_COLOR, agentName, collaboration, dagLevels, decisions, latestPlan,
  llmUsage, packageOf, stateLabel, taskStates, toolCalls, type TaskState, type TraceVerdict,
} from '../agentTrace';

const { Text } = Typography;
const TASK_TAG: Record<TaskState, { color: string; label: string }> = {
  waiting: { color: 'default', label: 'Chờ' },
  running: { color: 'processing', label: 'Đang chạy' },
  done: { color: 'green', label: 'Xong' },
  error: { color: 'red', label: 'Lỗi' },
};
const section: React.CSSProperties = { marginTop: 20 };
const h: React.CSSProperties = { margin: '0 0 8px', fontSize: 14, fontWeight: 650, color: 'var(--shb-navy-800)' };

/** Chi tiết một case: DAG planner, task, luồng phối hợp, công cụ MCP, quyết định, nguồn. Case đang chạy cập nhật qua SSE. */
export function CaseTrace({ caseId, onClose }: { caseId: string | null; onClose: () => void }) {
  return (
    <Drawer open={!!caseId} onClose={onClose} width={760} destroyOnHidden title={`Case ${caseId ?? ''}`}>
      {caseId && <CaseTraceBody caseId={caseId} />}
    </Drawer>
  );
}

function CaseTraceBody({ caseId }: { caseId: string }) {
  const qc = useQueryClient();
  const caseQ = useQuery({ queryKey: ['agent-case', caseId], queryFn: () => getAgentCase(caseId) });
  const eventsQ = useQuery({ queryKey: ['agent-case-events', caseId], queryFn: () => getAgentCaseEvents(caseId) });
  const [live, setLive] = useState<AgentCaseEvent[]>([]);
  const [streaming, setStreaming] = useState(false);

  // SSE: phát lại lịch sử rồi nhận sự kiện mới; token ở header, không ở URL.
  useEffect(() => {
    const ctrl = new AbortController();
    setStreaming(true);
    streamAgentCase(caseId, (e) => {
      setLive((cur) => (cur.some((x) => x.id === e.id) ? cur : [...cur, e]));
      void qc.invalidateQueries({ queryKey: ['agent-case', caseId] });
      void qc.invalidateQueries({ queryKey: ['agent-cases'] });
    }, ctrl.signal)
      .catch(() => undefined)
      .finally(() => setStreaming(false));
    return () => ctrl.abort();
  }, [caseId, qc]);

  const events = useMemo(() => {
    const byId = new Map<number, AgentCaseEvent>();
    [...(eventsQ.data ?? []), ...live].forEach((e) => byId.set(e.id, e));
    return [...byId.values()].sort((a, b) => a.id - b.id);
  }, [eventsQ.data, live]);

  if (caseQ.isError) {
    return <Alert type="warning" showIcon message="Không tải được case này" description="Bạn có thể không có quyền xem hồ sơ phân tích này." />;
  }
  if (!caseQ.data) return <Skeleton active />;

  const state = caseQ.data.state;
  const plan = latestPlan(events);
  const states = plan ? taskStates(events, plan.tasks) : {};
  const flow = collaboration(events);
  const calls = toolCalls(events);
  const usage = llmUsage(events);
  const decided = decisions(events);
  const pkg = caseQ.data.package ?? packageOf(events);
  // Chỉ hồ sơ đạt mới có gói phê duyệt; Cần bổ sung/Từ chối vẫn có ý kiến từng agent trong sự kiện.
  const verdicts: TraceVerdict[] =
    pkg?.verdicts ??
    events
      .filter((e) => e.type === 'task_finished' && e.payload?.verdict)
      .map((e) => e.payload!.verdict as TraceVerdict);
  const stopEvent = [...events].reverse().find((e) => e.type === 'state_changed' && e.payload?.state === state);
  const stopReason =
    (state === 'Needs Info' || state === 'Rejected') && typeof stopEvent?.payload?.reason === 'string'
      ? stopEvent.payload.reason
      : undefined;
  const sources = verdicts.flatMap((v) => (v.evidence ?? []).map((e) => ({ agent: v.agent, ...e })));

  return (
    <div data-testid="case-trace">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Tag color={STATE_COLOR[state] ?? 'default'} data-testid="case-state">{stateLabel(state)}</Tag>
        {streaming && <Text type="secondary" style={{ fontSize: 12 }}>● Đang nhận cập nhật trực tiếp</Text>}
        <Text type="secondary" style={{ fontSize: 12 }}>{events.length} sự kiện</Text>
        {usage && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            LLM: {usage.calls} lượt · {usage.tokens.toLocaleString('vi-VN')} token
            {usage.cost !== null && ` · $${usage.cost.toFixed(4)}`}
          </Text>
        )}
      </div>

      <section style={section} data-testid="trace-dag">
        <h3 style={h}>Kế hoạch của Planner (DAG)</h3>
        {plan ? (
          <>
            {plan.rationale && <Text type="secondary" style={{ fontSize: 12.5 }}>{plan.rationale}</Text>}
            <div style={{ display: 'flex', gap: 24, alignItems: 'stretch', marginTop: 8, overflowX: 'auto' }}>
              {dagLevels(plan.tasks).map((col, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 200 }}>
                  {col.map((t) => {
                    const st = states[t.task_id];
                    const tag = TASK_TAG[st?.state ?? 'waiting'];
                    return (
                      <div key={t.task_id} data-testid={`dag-task-${t.task_id}`}
                        style={{ border: '1px solid var(--shb-border)', borderRadius: 8, padding: '8px 10px', background: 'var(--shb-surface)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <b>{agentName(t.agent)}</b>
                          <Tag color={tag.color} style={{ marginInlineEnd: 0 }}>{tag.label}</Tag>
                        </div>
                        <div style={{ fontSize: 12.5, margin: '4px 0' }}>{t.objective}</div>
                        {t.depends_on.length > 0 && (
                          <Text type="secondary" style={{ fontSize: 11.5 }}>Chờ: {t.depends_on.join(', ')}</Text>
                        )}
                        {st?.verdict && (
                          <div style={{ fontSize: 12, marginTop: 4 }}>
                            {DECISION_LABEL[st.verdict.decision] ?? st.verdict.decision} — {st.verdict.summary}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Planner chưa lập kế hoạch cho case này." />
        )}
      </section>

      <section style={section} data-testid="trace-flow">
        <h3 style={h}>Luồng phối hợp giữa các agent</h3>
        {flow.length ? (
          <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {flow.map((f) => (
              <li key={f.id} style={{ fontSize: 13 }}>
                <b>{agentName(f.from)}</b> → <b>{agentName(f.to)}</b>{' '}
                <Tag bordered={false} color={f.kind === 'challenge' ? 'volcano' : 'default'}>{f.kind}</Tag>
                {f.text && <Text type="secondary">{f.text}</Text>}
              </li>
            ))}
          </ol>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có trao đổi giữa các agent." />
        )}
        {!flow.some((f) => f.kind === 'challenge') && flow.length > 0 && (
          <Text type="secondary" style={{ fontSize: 12 }}>Validation không phát challenge nào: các kết luận không mâu thuẫn.</Text>
        )}
      </section>

      <section style={section} data-testid="trace-tools">
        <h3 style={h}>Lời gọi công cụ MCP ({calls.length})</h3>
        {calls.length ? (
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <tbody>
              {calls.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--shb-border)' }}>
                  <td style={{ padding: '4px 0' }}>{agentName(c.agent)}</td>
                  <td><Typography.Text code>{c.tool}</Typography.Text></td>
                  <td><Tag bordered={false} color={c.outcome === 'ok' ? 'green' : 'red'}>{c.outcome === 'ok' ? 'Thành công' : c.outcome === 'denied' ? 'Bị từ chối' : 'Lỗi'}</Tag></td>
                  <td style={{ textAlign: 'right' }}>{c.durationMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Case này chưa ghi nhận lời gọi công cụ." />
        )}
      </section>

      <section style={section} data-testid="trace-decisions">
        <h3 style={h}>Quyết định</h3>
        {pkg?.recommendation && (
          <div style={{ fontSize: 13, marginBottom: 6 }}>
            Đề xuất của hội đồng agent: <b>{pkg.recommendation}</b>
            {pkg.proposed_limit != null && ` · Hạn mức ${pkg.proposed_limit.toLocaleString('vi-VN')} VND`}
            {pkg.required_approver_level && ` · Cấp xác nhận: ${pkg.required_approver_level}`}
          </div>
        )}
        {stopReason && (
          <div style={{ fontSize: 13, marginBottom: 6 }} data-testid="trace-stop-reason">
            {state === 'Rejected' ? 'Hội đồng agent đề xuất từ chối' : 'Hội đồng agent đề nghị bổ sung hồ sơ'}: <b>{stopReason}</b>
          </div>
        )}
        {verdicts.map((v) => (
          <div key={v.agent + v.summary} style={{ fontSize: 13 }}>
            <b>{agentName(v.agent)}</b>: {DECISION_LABEL[v.decision] ?? v.decision} — {v.summary}
          </div>
        ))}
        {decided.map((d) => (
          <div key={d.id} style={{ fontSize: 13, marginTop: 6 }}>
            <Tag color={d.tone === 'ok' ? 'green' : d.tone === 'error' ? 'red' : 'gold'}>{d.label}</Tag>
            {d.who && <Text type="secondary">Người xác nhận: {d.who}</Text>} {d.text}
          </div>
        ))}
        {state === 'Pending Approval' && decided.length === 0 && (
          <Text type="secondary" style={{ fontSize: 13 }}>Đang chờ người có thẩm quyền xác nhận; agent không tự phê duyệt.</Text>
        )}
        {!pkg && !stopReason && verdicts.length === 0 && decided.length === 0 && state !== 'Pending Approval' && (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có quyết định cho case này." />
        )}
      </section>

      {sources.length > 0 && (
        <section style={section} data-testid="trace-sources">
          <h3 style={h}>Nguồn trích dẫn ({sources.length})</h3>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {sources.map((s, i) => (
              <li key={i}><Typography.Text code>{s.source}</Typography.Text> {s.quote} <Text type="secondary">({agentName(s.agent)})</Text></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
