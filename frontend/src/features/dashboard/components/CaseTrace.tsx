import { useEffect, useMemo, useState } from 'react';
import { Alert, Drawer, Empty, Skeleton, Tag, Typography } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TERMINAL_STATES, getAgentCase, getAgentCaseEvents, getApproverNames, streamAgentCase, type AgentCaseEvent } from '@/services/agentCaseService';
import {
  DECISION_LABEL, STATE_COLOR, agentName, collaboration, dagLevels, decisions, latestPlan,
  llmUsage, packageOf, stateLabel, taskStates, toolCalls, type TaskState, type TraceVerdict,
  BOARD_LABEL, approverLevelLabel, realActions, scrubInternal, sharedBoards, sourceLabel, toolLabel, validationView,
} from '../agentTrace';
import { ProposalChain } from '@/features/agent-actions/ActionProposals';
import { statusLabel } from '@/features/my-work/format';
import { fmtInt, fmtUsd } from '@/utils/format';
import { TERM } from '@/utils/glossary';

const { Text } = Typography;
const TASK_TAG: Record<TaskState, { color: string; label: string }> = {
  waiting: { color: 'default', label: 'Chờ' },
  running: { color: 'processing', label: 'Đang chạy' },
  done: { color: 'green', label: 'Xong' },
  error: { color: 'red', label: 'Lỗi' },
};
const AI_TAG = <Tag color="purple" style={{ marginInlineStart: 6 }}>AI đề xuất</Tag>;
const SYSTEM_TAG = <Tag color="blue" style={{ marginInlineStart: 6 }}>Hệ thống tính</Tag>;
const section: React.CSSProperties = { marginTop: 20 };
const h: React.CSSProperties = { margin: '0 0 8px', fontSize: 14, fontWeight: 650, color: 'var(--shb-navy-800)' };

/** Chi tiết một case: DAG planner, task, luồng phối hợp, công cụ MCP, quyết định, nguồn. Case đang chạy cập nhật qua SSE. */
export function CaseTrace({ caseId, onClose }: { caseId: string | null; onClose: () => void }) {
  return (
    <Drawer open={!!caseId} onClose={onClose} width={760} destroyOnHidden title={`${TERM.runs} ${caseId ?? ''}`}>
      {caseId && <CaseTraceBody caseId={caseId} />}
    </Drawer>
  );
}

/** Văn bản dài do agent sinh: che mã nội bộ, rút gọn 3 dòng, bấm để xem đầy đủ. */
function ClampText({ text, secondary }: { text: string; secondary?: boolean }) {
  const [full, setFull] = useState(false);
  const clean = scrubInternal(text);
  const long = clean.length > 160;
  return (
    <span style={secondary ? { color: 'var(--text-3)', fontSize: 12.5 } : undefined}>
      <span style={!full && long ? { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : undefined}>{clean}</span>
      {long && <button type="button" onClick={() => setFull(!full)} style={{ border: 0, background: 'none', color: 'var(--info)', cursor: 'pointer', padding: 0, fontSize: 12 }}>{full ? 'Thu gọn' : 'Xem đầy đủ'}</button>}
    </span>
  );
}

function CaseTraceBody({ caseId }: { caseId: string }) {
  const qc = useQueryClient();
  // Polling dự phòng (như AgentTeamPanel): SSE có thể bị proxy đệm hoặc đứt; case chưa kết thúc thì vẫn tự cập nhật.
  const caseQ = useQuery({
    queryKey: ['agent-case', caseId],
    queryFn: () => getAgentCase(caseId),
    refetchInterval: (q) => (q.state.data && TERMINAL_STATES.includes(q.state.data.state) ? false : 3000),
  });
  const running = !caseQ.data || !TERMINAL_STATES.includes(caseQ.data.state);
  const eventsQ = useQuery({
    queryKey: ['agent-case-events', caseId],
    queryFn: () => getAgentCaseEvents(caseId),
    refetchInterval: running ? 3000 : false,
  });
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

  const approverIds = [...new Set(decisions(events).map((d) => d.who).filter((w): w is string => !!w))].sort();
  const namesQ = useQuery({
    queryKey: ['agent-approver-names', approverIds.join(',')],
    queryFn: () => getApproverNames(approverIds),
    enabled: approverIds.length > 0,
  });

  if (caseQ.isError) {
    return <Alert type="warning" showIcon message="Không tải được lượt phân tích này" description="Bạn có thể không có quyền xem hồ sơ phân tích này." />;
  }
  if (!caseQ.data) return <Skeleton active />;

  const state = caseQ.data.state;
  const plan = latestPlan(events);
  const states = plan ? taskStates(events, plan.tasks) : {};
  const flow = collaboration(events);
  const calls = toolCalls(events);
  const usage = llmUsage(events);
  const decided = decisions(events);
  const boards = sharedBoards(events);
  const validation = validationView(events);
  const actions = realActions(events);
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
            LLM: {usage.calls} lượt · {fmtInt(usage.tokens)} token
            {usage.cost !== null && ` · ${fmtUsd(usage.cost)}`}
          </Text>
        )}
      </div>

      <section style={section} data-testid="trace-dag">
        <h3 style={h}>{TERM.plannerAssign}{AI_TAG}</h3>
        {plan ? (
          <>
            {plan.rationale && <ClampText text={plan.rationale} secondary />}
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
                        <div style={{ fontSize: 12.5, margin: '4px 0' }}><ClampText text={t.objective} /></div>
                        {t.depends_on.length > 0 && (
                          <Text type="secondary" style={{ fontSize: 11.5 }}>
                            Chờ kết quả của: {t.depends_on.map((d) => { const dep = plan.tasks.find((x) => x.task_id === d); return dep ? agentName(dep.agent) : d; }).join(', ')}
                          </Text>
                        )}
                        {st?.verdict && (
                          <div style={{ fontSize: 12, marginTop: 4 }}>
                            {DECISION_LABEL[st.verdict.decision] ?? st.verdict.decision} — {scrubInternal(st.verdict.summary)}
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
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Planner chưa lập kế hoạch cho lượt phân tích này." />
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
          <Text type="secondary" style={{ fontSize: 12 }}>Validation không phát phản biện nào: các kết luận không mâu thuẫn.</Text>
        )}
      </section>

      <section style={section} data-testid="trace-tools">
        <h3 style={h}>Công cụ: agent nào đã gọi ({calls.length})</h3>
        {calls.length ? (
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <tbody>
              {calls.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--shb-border)' }}>
                  <td style={{ padding: '4px 0' }}>{agentName(c.agent)}</td>
                  <td>{toolLabel(c.tool)} <Typography.Text code>{c.tool}</Typography.Text></td>
                  <td>
                    {c.initiatedBy === 'system_compensation'
                      ? <Tag color="blue" bordered={false} data-testid="tool-compensated">Hệ thống gọi bù</Tag>
                      : <Tag bordered={false} data-testid="tool-by-agent">Agent tự gọi</Tag>}
                  </td>
                  <td><Tag bordered={false} color={c.outcome === 'ok' ? 'green' : 'red'}>{c.outcome === 'ok' ? 'Thành công' : c.outcome === 'denied' ? 'Bị từ chối' : 'Lỗi'}</Tag></td>
                  <td style={{ textAlign: 'right' }}>{c.durationMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Lượt phân tích này chưa ghi nhận lời gọi công cụ." />
        )}
      </section>

      <section style={section} data-testid="trace-board">
        <h3 style={h}>Bảng chung của đội agent</h3>
        {boards.length ? (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {boards.map((b) => (
              <li key={b.id}>
                <b>{agentName(b.scope)}</b> gom {b.keys.length} mục: {b.keys.map((k) => BOARD_LABEL[k] ?? k).join(', ')}
                {b.compensated.length > 0 && (
                  <> — <Tag color="blue" bordered={false}>Hệ thống gọi bù</Tag>{b.compensated.map((k) => BOARD_LABEL[k] ?? k).join(', ')} (agent bỏ sót mục bắt buộc)</>
                )}
                {b.choices.length > 0 && (
                  <ul data-testid="tool-choices" style={{ margin: '2px 0 4px', paddingLeft: 16 }}>
                    {b.choices.map((c) => (
                      <li key={c.tool}>
                        {toolLabel(c.tool)}: <Text type="secondary">{c.how === 'agent' ? 'agent tự chọn' : c.how === 'system' ? 'hệ thống gọi bù' : 'không gọi'} — {c.reason}</Text>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Text type="secondary" style={{ fontSize: 13 }}>Chưa có dữ liệu gom lên bảng chung (ca chạy không dùng công cụ động).</Text>
        )}
      </section>

      <section style={section} data-testid="trace-validation">
        <h3 style={h}>Validation kiểm chứng</h3>
        {validation ? (
          <>
            <div style={{ fontSize: 13, marginBottom: 4 }}>
              Phản biện: {validation.challenges} lần, đã xử lý {validation.handled}.
              {validation.challenges === 0 && ' Các kết luận chuyên gia không mâu thuẫn.'}
            </div>
            {validation.lines.length > 0 && (
              <>
                <div style={{ fontSize: 13 }}><b>Số liệu tính lại từ dữ liệu công cụ</b>{SYSTEM_TAG}</div>
                <ul style={{ margin: '4px 0', paddingLeft: 18, fontSize: 13 }} data-testid="validation-lines">
                  {validation.lines.map((l, i) => <li key={i}>{l}</li>)}
                </ul>
              </>
            )}
            {validation.issues.length > 0 && (
              <ul style={{ margin: '4px 0', paddingLeft: 18, fontSize: 13 }}>
                {validation.issues.map((l, i) => <li key={i}>{l}</li>)}
              </ul>
            )}
            {validation.narrative && (
              <div style={{ fontSize: 13 }}><b>Diễn giải cho người duyệt</b>{AI_TAG}<div>{validation.narrative}</div></div>
            )}
          </>
        ) : (
          <Text type="secondary" style={{ fontSize: 13 }}>Validation chưa kiểm chứng lượt phân tích này.</Text>
        )}
      </section>

      <section style={section} data-testid="trace-decisions">
        <h3 style={h}>Quyết định của người duyệt và hành động thật</h3>
        {pkg?.recommendation && (
          <div style={{ fontSize: 13, marginBottom: 6 }}>
            Đề xuất của đội agent{AI_TAG}: <b>{pkg.recommendation}</b>
            {pkg.proposed_limit != null && ` · Hạn mức ${fmtInt(pkg.proposed_limit)} VND`}
            {pkg.required_approver_level && ` · Cấp xác nhận: ${approverLevelLabel(pkg.required_approver_level)}`}
          </div>
        )}
        {stopReason && (
          <div style={{ fontSize: 13, marginBottom: 6 }} data-testid="trace-stop-reason">
            {state === 'Rejected' ? 'Đội agent đề xuất từ chối' : 'Đội agent đề nghị bổ sung hồ sơ'}: <b>{stopReason}</b>
          </div>
        )}
        {verdicts.map((v) => (
          <div key={v.agent + v.summary} style={{ fontSize: 13 }}>
            <b>{agentName(v.agent)}</b>: {DECISION_LABEL[v.decision] ?? v.decision} — {scrubInternal(v.summary)}
          </div>
        ))}
        {decided.map((d) => (
          <div key={d.id} style={{ fontSize: 13, marginTop: 6 }}>
            <Tag color={d.tone === 'ok' ? 'green' : d.tone === 'error' ? 'red' : 'gold'}>{d.label}</Tag>
            {d.who && <Text type="secondary">Người xác nhận: {namesQ.data?.[d.who] ?? 'Không rõ'}</Text>} {d.text}
          </div>
        ))}
        {actions.map((a) => (
          <div key={a.id} style={{ fontSize: 13, marginTop: 6 }} data-testid="trace-real-action">
            <Tag color="green">Hành động thật</Tag>
            Hồ sơ vay đã chuyển sang <b>{statusLabel(a.workflowStatus)}</b> qua bước quyết định của quy trình (có ghi nhật ký kiểm toán).
          </div>
        ))}
        <ProposalChain events={events} />
        {state === 'Pending Approval' && !decided.some((d) => d.label !== 'Nhắc/chuyển cấp do quá hạn') && (
          <Text type="secondary" style={{ fontSize: 13 }}>Đang chờ người có thẩm quyền xác nhận; agent không tự phê duyệt.</Text>
        )}
        {!pkg && !stopReason && verdicts.length === 0 && decided.length === 0 && state !== 'Pending Approval' && (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có quyết định cho lượt phân tích này." />
        )}
      </section>

      <div data-testid="trace-decider" style={{ ...section, fontSize: 13 }}>
        <b>{TERM.decider}:</b>{' '}
        {(caseQ.data.approver && namesQ.data?.[caseQ.data.approver])
          || (pkg?.required_approver_level ? `cấp ${approverLevelLabel(pkg.required_approver_level)}` : 'người có thẩm quyền theo cấp phê duyệt')}
        . Đội agent chỉ đề xuất, không tự phê duyệt.
      </div>

      {sources.length > 0 && (
        <section style={section} data-testid="trace-sources">
          <h3 style={h}>Nguồn trích dẫn ({sources.length})</h3>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {sources.map((s, i) => (
              <li key={i}><Typography.Text code>{sourceLabel(s.source)}</Typography.Text> {s.quote} <Text type="secondary">({agentName(s.agent)})</Text></li>
            ))}
          </ul>
          <details style={{ fontSize: 12, marginTop: 6 }}><summary>Chi tiết kỹ thuật (kiểm toán)</summary>
            {sources.map((s, i) => <div key={i}>{s.source}: {s.raw_quote ?? s.quote}</div>)}
          </details>
        </section>
      )}
    </div>
  );
}
