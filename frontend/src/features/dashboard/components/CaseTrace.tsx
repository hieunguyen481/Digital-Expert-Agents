import { useEffect, useMemo, useState } from 'react';
import { Drawer, Skeleton } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TERMINAL_STATES, getAgentCase, getAgentCaseEvents, getApproverNames, streamAgentCase, type AgentCaseEvent } from '@/services/agentCaseService';
import {
  DECISION_LABEL, STATE_TONE, agentName, fmtSeconds, collaboration, dagLevels, decisions, latestPlan,
  llmUsage, packageOf, stateLabel, taskStates, toolCalls, type TaskState, type TraceVerdict,
  BOARD_LABEL, approverLevelLabel, realActions, scrubInternal, sharedBoards, sourceLabel, toolLabel, validationView,
} from '../agentTrace';
import { ProposalChain } from '@/features/agent-actions/ActionProposals';
import { statusLabel } from '@/features/my-work/format';
import { AiBlock, AiTag, HumanBlock, StateBlock, StatusPill } from '@/components/ui';
import { fmtInt, fmtUsd } from '@/utils/format';
import { TERM } from '@/utils/glossary';
import styles from './CaseTrace.module.css';

const TASK_TAG: Record<TaskState, { tone: 'neutral' | 'ai' | 'ok' | 'bad'; label: string }> = {
  waiting: { tone: 'neutral', label: 'Chờ' },
  running: { tone: 'ai', label: 'Đang chạy' },
  done: { tone: 'ok', label: 'Xong' },
  error: { tone: 'bad', label: 'Lỗi' },
};
const SYSTEM_TAG = <StatusPill tone="info">Hệ thống tính</StatusPill>;
const FLOW_KIND: Record<string, string> = { challenge: 'phản biện', 'điều chỉnh sau challenge': 'điều chỉnh sau phản biện' };
const DECISION_TONE = { ok: 'ok', error: 'bad' } as const;

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
    <span className={secondary ? styles.dim : styles.text}>
      <span className={!full && long ? styles.clamp : undefined}>{clean}</span>
      {long && <button type="button" className={styles.linkBtn} aria-expanded={full} onClick={() => setFull(!full)}>{full ? 'Thu gọn' : 'Xem đầy đủ'}</button>}
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
    return <StateBlock kind="forbidden" compact title="Không tải được lượt phân tích này" description="Bạn có thể không có quyền xem lượt phân tích này." />;
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
  // Thời gian từng task = từ sự kiện task_started đến task_finished (giây, ts của engine).
  const taskSeconds = (taskId: string): number | null => {
    const mine = events.filter((e) => e.payload?.task_id === taskId);
    const a = mine.find((e) => e.type === 'task_started');
    const b = [...mine].reverse().find((e) => e.type === 'task_finished');
    return a && b && b.ts >= a.ts ? b.ts - a.ts : null;
  };
  const decidedHuman = decided.some((d) => d.label !== 'Nhắc/chuyển cấp do quá hạn');
  const deciderName = (caseQ.data.approver && namesQ.data?.[caseQ.data.approver])
    || (pkg?.required_approver_level ? `cấp ${approverLevelLabel(pkg.required_approver_level)}` : 'người có thẩm quyền theo cấp phê duyệt');

  return (
    <div className={styles.body} data-testid="case-trace">
      <div className={styles.head}>
        <span data-testid="case-state"><StatusPill tone={STATE_TONE[state] ?? 'neutral'}>{stateLabel(state)}</StatusPill></span>
        {streaming && <span className={styles.live}>Đang nhận cập nhật trực tiếp</span>}
        <span>{events.length} sự kiện</span>
        {usage && (
          <span>
            LLM: {usage.calls} lượt, {fmtInt(usage.tokens)} token
            {usage.cost !== null && `, ${fmtUsd(usage.cost)}`}
          </span>
        )}
      </div>

      <div data-testid="trace-dag">
        <AiBlock title={TERM.plannerAssign}>
          {plan ? (
            <div className={styles.sec}>
              {plan.rationale && <ClampText text={plan.rationale} secondary />}
              <div className={styles.flowWrap}>
                <div className={styles.frame}>
                  <div className={styles.node + ' ' + styles.done} style={{ alignSelf: 'center' }}>
                    <b style={{ fontSize: 13 }}>Planner</b>
                    <span className={styles.nodeSum}>Lập kế hoạch, giao việc</span>
                  </div>
                  {dagLevels(plan.tasks).map((col, i) => (
                    <div key={i} style={{ display: 'contents' }}>
                      <span className={styles.arr} aria-hidden>→</span>
                      <div className={styles.col}>
                        {col.map((t) => {
                          const st = states[t.task_id];
                          const tag = TASK_TAG[st?.state ?? 'waiting'];
                          const sec = st?.state === 'done' ? taskSeconds(t.task_id) : null;
                          return (
                            <div key={t.task_id} data-testid={`dag-task-${t.task_id}`}
                              className={`${styles.node} ${st?.state === 'done' ? styles.done : ''} ${st?.state === 'running' ? styles.running : ''} ${st?.state === 'error' ? styles.error : ''}`}>
                              <div className={styles.nodeHead}>
                                <b>{agentName(t.agent)}</b>
                                <StatusPill tone={tag.tone}>{tag.label}</StatusPill>
                              </div>
                              <div className={styles.nodeSum}><ClampText text={t.objective} /></div>
                              {t.depends_on.length > 0 && (
                                <span className={styles.nodeDep}>
                                  Chờ kết quả của: {t.depends_on.map((d) => { const dep = plan.tasks.find((x) => x.task_id === d); return dep ? agentName(dep.agent) : d; }).join(', ')}
                                </span>
                              )}
                              {st?.verdict && (
                                <span className={styles.nodeSum}>
                                  <b>{DECISION_LABEL[st.verdict.decision] ?? st.verdict.decision}</b>: {scrubInternal(st.verdict.summary)}
                                </span>
                              )}
                              {sec != null && <span className={styles.tm}>{fmtSeconds(sec)}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <span className={styles.arrHm} aria-hidden>→</span>
                <div className={styles.hm}><b>{TERM.decider}</b>Ngoài khung AI, quyết định cuối cùng</div>
              </div>
            </div>
          ) : (
            <span className={styles.text}>Planner chưa lập kế hoạch cho lượt phân tích này.</span>
          )}
        </AiBlock>
      </div>

      <section className={styles.sec} data-testid="trace-flow">
        <h3>Luồng phối hợp giữa các agent</h3>
        {flow.length ? (
          <ol className={styles.flowList}>
            {flow.map((f) => (
              <li key={f.id}>
                <b>{agentName(f.from)}</b> → <b>{agentName(f.to)}</b>
                <StatusPill tone={f.kind === 'challenge' ? 'warn' : 'neutral'}>{FLOW_KIND[f.kind] ?? f.kind}</StatusPill>
                {f.text && <span className={styles.dim}>{f.text}</span>}
              </li>
            ))}
          </ol>
        ) : (
          <span className={styles.text}>Chưa có trao đổi giữa các agent.</span>
        )}
        {!flow.some((f) => f.kind === 'challenge') && flow.length > 0 && (
          <span className={styles.dim}>Validation không phát phản biện nào: các kết luận không mâu thuẫn.</span>
        )}
      </section>

      <section className={styles.sec} data-testid="trace-tools">
        <h3>Công cụ: agent nào đã gọi ({calls.length})</h3>
        {calls.length ? (
          <table className={styles.tbl}>
            <thead><tr><th scope="col">Agent</th><th scope="col">Công cụ</th><th scope="col">Người gọi</th><th scope="col">Kết quả</th><th scope="col" className={styles.r}>Thời gian</th></tr></thead>
            <tbody>
              {calls.map((c) => (
                <tr key={c.id}>
                  <td>{agentName(c.agent)}</td>
                  <td>{toolLabel(c.tool)} <span className={styles.mono}>{c.tool}</span></td>
                  <td>
                    {c.initiatedBy === 'system_compensation'
                      ? <span data-testid="tool-compensated"><StatusPill tone="info">Hệ thống gọi bù</StatusPill></span>
                      : <span data-testid="tool-by-agent"><StatusPill>Agent tự gọi</StatusPill></span>}
                  </td>
                  <td><StatusPill tone={c.outcome === 'ok' ? 'ok' : 'bad'}>{c.outcome === 'ok' ? 'Thành công' : c.outcome === 'denied' ? 'Bị từ chối' : 'Lỗi'}</StatusPill></td>
                  <td className={styles.r}>{c.durationMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <span className={styles.text}>Lượt phân tích này chưa ghi nhận lời gọi công cụ.</span>
        )}
      </section>

      <section className={styles.sec} data-testid="trace-board">
        <h3>Bảng chung của đội agent</h3>
        {boards.length ? (
          <ul className={styles.plainList}>
            {boards.map((b) => (
              <li key={b.id} className={styles.text}>
                <b>{agentName(b.scope)}</b> gom {b.keys.length} mục: {b.keys.map((k) => BOARD_LABEL[k] ?? k).join(', ')}
                {b.compensated.length > 0 && (
                  <> <StatusPill tone="info">Hệ thống gọi bù</StatusPill> {b.compensated.map((k) => BOARD_LABEL[k] ?? k).join(', ')} (agent bỏ sót mục bắt buộc)</>
                )}
                {b.choices.length > 0 && (
                  <ul data-testid="tool-choices" className={styles.sub}>
                    {b.choices.map((c) => (
                      <li key={c.tool}>
                        {toolLabel(c.tool)}: {c.how === 'agent' ? 'agent tự chọn' : c.how === 'system' ? 'hệ thống gọi bù' : 'không gọi'}, {c.reason}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <span className={styles.dim}>Chưa có dữ liệu gom lên bảng chung (lượt chạy không dùng công cụ động).</span>
        )}
      </section>

      <section className={styles.sec} data-testid="trace-validation">
        <h3>Validation kiểm chứng</h3>
        {validation ? (
          <>
            <span className={styles.text}>
              Phản biện: {validation.challenges} lần, đã xử lý {validation.handled}.
              {validation.challenges === 0 && ' Các kết luận chuyên gia không mâu thuẫn.'}
            </span>
            {validation.lines.length > 0 && (
              <>
                <span className={styles.text}><b>Số liệu tính lại từ dữ liệu công cụ</b> {SYSTEM_TAG}</span>
                <ul className={styles.sub} data-testid="validation-lines">
                  {validation.lines.map((l, i) => <li key={i}>{l}</li>)}
                </ul>
              </>
            )}
            {validation.issues.length > 0 && (
              <ul className={styles.sub}>
                {validation.issues.map((l, i) => <li key={i}>{l}</li>)}
              </ul>
            )}
            {validation.narrative && (
              <span className={styles.text}><b>Diễn giải cho người duyệt</b> <AiTag />
                <span style={{ display: 'block' }}>{validation.narrative}</span></span>
            )}
          </>
        ) : (
          <span className={styles.dim}>Validation chưa kiểm chứng lượt phân tích này.</span>
        )}
      </section>

      <section className={styles.sec} data-testid="trace-decisions">
        <h3>Quyết định của người duyệt và hành động thật</h3>
        {pkg?.recommendation && (
          <div className={styles.dec}>
            <span>Đề xuất của đội agent</span><AiTag /><b>{pkg.recommendation}</b>
            {pkg.proposed_limit != null && <span>, hạn mức {fmtInt(pkg.proposed_limit)} VND</span>}
            {pkg.required_approver_level && <span>, cấp xác nhận: {approverLevelLabel(pkg.required_approver_level)}</span>}
          </div>
        )}
        {stopReason && (
          <div className={styles.dec} data-testid="trace-stop-reason">
            {state === 'Rejected' ? 'Đội agent đề xuất từ chối' : 'Đội agent đề nghị bổ sung hồ sơ'}: <b>{stopReason}</b>
          </div>
        )}
        {verdicts.map((v) => (
          <div key={v.agent + v.summary} className={styles.dec}>
            <b>{agentName(v.agent)}</b>: {DECISION_LABEL[v.decision] ?? v.decision}, {scrubInternal(v.summary)}
          </div>
        ))}
        {decided.map((d) => (
          <div key={d.id} className={styles.dec}>
            <StatusPill tone={DECISION_TONE[d.tone as 'ok' | 'error'] ?? 'warn'}>{d.label}</StatusPill>
            {d.who && <span className={styles.dim}>Người xác nhận: {namesQ.data?.[d.who] ?? 'Không rõ'}</span>} {d.text}
          </div>
        ))}
        {actions.map((a) => (
          <div key={a.id} className={styles.dec} data-testid="trace-real-action">
            <StatusPill tone="ok">Hành động thật</StatusPill>
            Hồ sơ vay đã chuyển sang <b>{statusLabel(a.workflowStatus)}</b> qua bước quyết định của quy trình (có ghi nhật ký kiểm toán).
          </div>
        ))}
        <ProposalChain events={events} />
        {state === 'Pending Approval' && !decidedHuman && (
          <span className={styles.dim}>Đang chờ người có thẩm quyền xác nhận; agent không tự phê duyệt.</span>
        )}
        {!pkg && !stopReason && verdicts.length === 0 && decided.length === 0 && state !== 'Pending Approval' && (
          <span className={styles.dim}>Chưa có quyết định cho lượt phân tích này.</span>
        )}
      </section>

      <div data-testid="trace-decider">
        <HumanBlock title={TERM.decider}>
          <span className={styles.text}><b>{deciderName}</b>. Đội agent chỉ đề xuất, không tự phê duyệt.</span>
        </HumanBlock>
      </div>

      {sources.length > 0 && (
        <section className={styles.sec} data-testid="trace-sources">
          <h3>Nguồn trích dẫn ({sources.length})</h3>
          <ul className={styles.plainList}>
            {sources.map((s, i) => (
              <li key={i} className={styles.text}><span className={styles.mono}>{sourceLabel(s.source)}</span> {s.quote} <span className={styles.dim}>({agentName(s.agent)})</span></li>
            ))}
          </ul>
          <details className={styles.det}><summary>Chi tiết kỹ thuật (kiểm toán)</summary>
            {sources.map((s, i) => <div key={i} className={styles.mono}>{s.source}: {s.raw_quote ?? s.quote}</div>)}
          </details>
        </section>
      )}
    </div>
  );
}
