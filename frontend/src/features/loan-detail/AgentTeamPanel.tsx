import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Skeleton, Tag } from 'antd';
import { LockOutlined, RobotOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { normalizeError } from '@/services/apiClient';
import {
  TERMINAL_STATES, getAgentCase, getAgentCaseEvents, streamAgentCase, type AgentCaseEvent,
} from '@/services/agentCaseService';
import {
  DECISION_LABEL, STATE_COLOR, agentName, approverLevelLabel, latestPlan, packageOf, sourceLabel, stateLabel, taskStates, type TraceVerdict,
} from '@/features/dashboard/agentTrace';
import { ActionProposals } from '@/features/agent-actions/ActionProposals';
import { fetchAgentRuns, startAgentRun } from './loanDetailService';
import { fmtDate, fmtMoney } from './format';
import styles from './loan-detail.module.css';

type NodeState = 'idle' | 'running' | 'done';
const FLOW = [
  { key: 'planner', title: 'Planner', note: 'Lập kế hoạch, giao việc' },
  { key: 'experts', title: 'Credit · Compliance · Operations', note: 'Chuyên gia: tài chính, tuân thủ, vận hành' },
  { key: 'validation', title: 'Validation', note: 'Kiểm chứng chéo, phản biện' },
] as const;

/** Sơ đồ đội agent: Planner → chuyên gia → Kiểm chứng → người quyết định. Màu node theo tiến độ lượt chạy gần nhất. */
export function AgentFlow({ tasks, states, decider }: {
  tasks?: Array<{ task_id: string; agent: string }>; states?: Record<string, { state: string }>; decider: string;
}) {
  const stateOf = (keys: string[]): NodeState => {
    const ts = (tasks ?? []).filter((t) => keys.includes(t.agent));
    if (!tasks) return 'idle';
    if (ts.length === 0) return keys.includes('planner') ? 'done' : 'idle';
    const st = ts.map((t) => states?.[t.task_id]?.state ?? 'waiting');
    if (st.every((x) => x === 'done')) return 'done';
    return st.some((x) => x === 'running' || x === 'done') ? 'running' : 'idle';
  };
  const cls = (n: NodeState) => (n === 'done' ? styles.nodeDone : n === 'running' ? styles.nodeRun : '');
  const keys: Record<string, string[]> = { planner: ['planner'], experts: ['credit', 'compliance', 'operations', 'document'], validation: ['validation'] };
  return (
    <div className={styles.flow} data-testid="agent-flow" role="group" aria-label="Sơ đồ đội agent">
      {FLOW.map((n) => (
        <span key={n.key} style={{ display: 'contents' }}>
          <div className={`${styles.node} ${cls(stateOf(keys[n.key]))}`}><b>{n.title}</b><small>{n.note}</small></div>
          <span className={styles.arrow} aria-hidden>→</span>
        </span>
      ))}
      <div className={`${styles.node} ${styles.nodeHuman}`}><b>Người quyết định</b><small>{decider} · AI chỉ đề xuất</small></div>
    </div>
  );
}

const TASK_LABEL = { waiting: 'Chờ', running: 'Đang chạy', done: 'Xong', error: 'Lỗi' } as const;

export const AGENT_RUN_TIMEOUT_MS = 5 * 60_000;

/** Đội agent trên hồ sơ thật: chạy, theo dõi qua SSE, xem đề xuất. AI chỉ đề xuất; người có thẩm quyền quyết định. */
export function AgentTeamPanel({ loanId, currency }: { loanId: string; currency: string }) {
  const qc = useQueryClient();
  const runsQ = useQuery({ queryKey: ['loan-agent-runs', loanId], queryFn: () => fetchAgentRuns(loanId) });
  const run = useMutation({
    mutationFn: () => startAgentRun(loanId),
    onSuccess: (data) => qc.setQueryData(['loan-agent-runs', loanId], data),
    onError: () => void qc.invalidateQueries({ queryKey: ['loan-agent-runs', loanId] }),
  });
  const data = runsQ.data;
  const latest = data?.latest ?? null;
  // Cùng khóa với RunBody nên dùng chung dữ liệu: khóa nút khi lượt gần nhất chưa kết thúc.
  const latestCaseQ = useQuery({
    queryKey: ['agent-case', latest?.case_id], queryFn: () => getAgentCase(latest!.case_id), enabled: !!latest,
    refetchInterval: (q) => (q.state.data && TERMINAL_STATES.includes(q.state.data.state) ? false : 4000),
  });
  const inProgress = !!latestCaseQ.data && !TERMINAL_STATES.includes(latestCaseQ.data.state);
  // X2: lượt chạy quá 5 phút chưa kết thúc thì báo rõ thay vì quay mãi; server tự mở khóa chạy lại khi engine ngừng cập nhật.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!inProgress) return undefined;
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, [inProgress]);
  const startedMs = latest ? Date.parse(latest.created_at) : NaN;
  const overdue = inProgress && Number.isFinite(startedMs) && now - startedMs > AGENT_RUN_TIMEOUT_MS;

  return (
    <section id="doi-agent" className={`${styles.panel} ${styles.agentPanel}`} aria-label="Đội agent" data-testid="agent-team">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}><RobotOutlined /> Đội agent thẩm định <Tag color="purple">AI đề xuất – chưa xác nhận</Tag></h2>
        {data?.can_run && (
          <Button type={latest ? 'default' : 'primary'} data-testid="run-agent-team" loading={run.isPending} disabled={inProgress} onClick={() => run.mutate()}
            title={inProgress ? 'Đội agent đang chạy, chờ kết thúc rồi mới chạy lại' : undefined}>
            {inProgress ? 'Đội agent đang chạy…' : latest ? 'Chạy lại đội agent' : 'Chạy đội agent'}
          </Button>
        )}
      </div>
      {!latest && <AgentFlow decider="Cấp phê duyệt có thẩm quyền" />}
      {runsQ.isError && (
        <Alert type="error" showIcon style={{ marginTop: 8 }} message="Không tải được trạng thái đội agent"
          description={normalizeError(runsQ.error).message}
          action={<Button size="small" onClick={() => void runsQ.refetch()}>Thử lại</Button>} />
      )}
      {runsQ.isLoading && <Skeleton active paragraph={{ rows: 2 }} />}
      {data && !data.can_run && data.deny_reason && (
        <span className={styles.note} data-testid="agent-team-lock" style={{ display: 'block', marginTop: 8 }}>
          <LockOutlined /> {data.deny_reason}
        </span>
      )}
      {run.isError && (
        <Alert type="error" showIcon style={{ marginTop: 8 }} data-testid="agent-run-error"
          message={normalizeError(run.error).message} />
      )}
      {data && !latest && (
        <span className={styles.note} data-testid="agent-team-empty" style={{ display: 'block', marginTop: 8 }}>
          Chưa chạy đội agent trên hồ sơ này.
        </span>
      )}
      {overdue && (
        <Alert type="warning" showIcon style={{ marginTop: 8 }} data-testid="agent-run-timeout"
          message="Lượt chạy quá 5 phút chưa kết thúc"
          description="Đội agent có thể đang xử lý chậm hoặc đã dừng giữa chừng. Bấm cập nhật để kiểm tra lại; nếu engine ngừng cập nhật, hệ thống tự mở khóa để chạy lại sau 20 phút kể từ cập nhật cuối."
          action={<Button size="small" onClick={() => void latestCaseQ.refetch()}>Cập nhật trạng thái</Button>} />
      )}
      {latest && <RunBody key={latest.case_id} caseId={latest.case_id} currency={currency} />}
      {latest && <ActionProposals caseId={latest.case_id} loanId={loanId} />}
      {data && data.runs.length > 1 && (
        <div className={styles.section} data-testid="agent-run-history">
          <b>Các lượt trước ({data.runs.length - 1})</b>
          {data.runs.slice(1).map((r) => (
            <span key={r.id} className={styles.note}>
              {fmtDate(r.created_at)} · {r.started_by_name ?? '—'} · <Link to={`/dashboard?case=${r.case_id}`}>{r.case_id}</Link>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function RunBody({ caseId, currency }: { caseId: string; currency: string }) {
  const qc = useQueryClient();
  const caseQ = useQuery({
    queryKey: ['agent-case', caseId], queryFn: () => getAgentCase(caseId),
    refetchInterval: (q) => (q.state.data && TERMINAL_STATES.includes(q.state.data.state) ? false : 4000),
  });
  const finishedNow = !!caseQ.data && TERMINAL_STATES.includes(caseQ.data.state);
  // SSE cho tiến trình trực tiếp; thăm dò định kỳ chỉ là dự phòng khi luồng đứt, và một lần cuối khi case kết thúc.
  const eventsQ = useQuery({
    queryKey: ['agent-case-events', caseId], queryFn: () => getAgentCaseEvents(caseId),
    refetchInterval: finishedNow ? false : 3000,
  });
  useEffect(() => { if (finishedNow) void eventsQ.refetch(); }, [finishedNow]); // eslint-disable-line react-hooks/exhaustive-deps
  const [live, setLive] = useState<AgentCaseEvent[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamError, setStreamError] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    setStreaming(true);
    setStreamError(false);
    streamAgentCase(caseId, (e) => {
      setLive((cur) => (cur.some((x) => x.id === e.id) ? cur : [...cur, e]));
      void qc.invalidateQueries({ queryKey: ['agent-case', caseId] });
    }, ctrl.signal)
      .catch(() => { if (!ctrl.signal.aborted) setStreamError(true); })
      .finally(() => setStreaming(false));
    return () => ctrl.abort();
  }, [caseId, qc]);

  const events = useMemo(() => {
    const byId = new Map<number, AgentCaseEvent>();
    [...(eventsQ.data ?? []), ...live].forEach((e) => byId.set(e.id, e));
    return [...byId.values()].sort((a, b) => a.id - b.id);
  }, [eventsQ.data, live]);

  if (caseQ.isError) {
    return <Alert type="warning" showIcon style={{ marginTop: 8 }} message="Không tải được lượt chạy gần nhất"
      description={normalizeError(caseQ.error).message} action={<Button size="small" onClick={() => void caseQ.refetch()}>Thử lại</Button>} />;
  }
  if (!caseQ.data) return <Skeleton active paragraph={{ rows: 3 }} />;

  const c = caseQ.data;
  const finished = TERMINAL_STATES.includes(c.state);
  const plan = latestPlan(events);
  const states = plan ? taskStates(events, plan.tasks) : {};
  const pkg = c.package ?? packageOf(events);
  const verdicts: TraceVerdict[] = pkg?.verdicts
    ?? events.filter((e) => e.type === 'task_finished' && e.payload?.verdict).map((e) => e.payload!.verdict as TraceVerdict);
  const sources = verdicts.flatMap((v) => (v.evidence ?? []).map((e) => ({ agent: v.agent, ...e })));
  const findings = verdicts.filter((v) => v.decision !== 'pass' && v.decision !== 'approve');

  return (
    <div data-testid="agent-run" data-state={c.state}>
      <div className={styles.section}>
        <div>
          <Tag color={STATE_COLOR[c.state] ?? 'default'} data-testid="agent-run-state">{stateLabel(c.state)}</Tag>
          <span className={styles.note}>
            {finished ? 'Đã kết thúc' : streamError ? 'Mất luồng trực tiếp, đang cập nhật định kỳ' : streaming ? '● Đang nhận cập nhật trực tiếp' : 'Đang cập nhật'}
            {` · ${events.length} sự kiện · `}
          </span>
          <Link to={`/dashboard?case=${caseId}`} data-testid="agent-trace-link">Xem trace của case</Link>
        </div>
        <AgentFlow tasks={plan?.tasks} states={states} decider="Cấp phê duyệt có thẩm quyền" />
        {plan && (
          <div data-testid="agent-progress" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {plan.tasks.map((t) => {
              const st = states[t.task_id]?.state ?? 'waiting';
              return <Tag key={t.task_id} color={st === 'done' ? 'green' : st === 'running' ? 'processing' : st === 'error' ? 'red' : 'default'}>
                {agentName(t.agent)}: {TASK_LABEL[st]}
              </Tag>;
            })}
          </div>
        )}
        {!plan && !finished && <span className={styles.note}>Đang chờ Planner lập kế hoạch…</span>}
      </div>

      {finished && !pkg && !verdicts.length && (
        <Alert type="info" showIcon message={`Case kết thúc ở trạng thái "${stateLabel(c.state)}" và chưa có gói đề xuất.`} />
      )}
      {(pkg?.recommendation || pkg?.proposed_limit != null) && (
        <div className={styles.section} data-testid="agent-recommendation">
          <b>Đề xuất cổng (chưa có hiệu lực)</b>
          {pkg?.recommendation && <span>{pkg.recommendation}</span>}
          {pkg?.proposed_limit != null && <span>Hạn mức đề xuất: <span className={styles.num}>{fmtMoney(String(pkg.proposed_limit), currency)}</span></span>}
          {pkg?.required_approver_level && <span className={styles.note}>Cấp phê duyệt đề xuất: {approverLevelLabel(pkg.required_approver_level)}</span>}
          {pkg?.conditions?.map((x) => <span key={x} className={styles.note}>Điều kiện: {x}</span>)}
        </div>
      )}
      {verdicts.length > 0 && (
        <div className={styles.section} data-testid="agent-findings">
          <b>Phát hiện của từng chuyên gia ({findings.length} cần chú ý)</b>
          {verdicts.map((v, i) => (
            <span key={`${v.agent}-${i}`}>
              <Tag color={findings.includes(v) ? 'warning' : 'success'}>{DECISION_LABEL[v.decision] ?? v.decision}</Tag>
              <b>{agentName(v.agent)}</b> — {v.summary}
            </span>
          ))}
        </div>
      )}
      {sources.length > 0 && (
        <div className={styles.section} data-testid="agent-sources">
          <b>Trích nguồn</b>
          {sources.map((s, i) => (
            <span key={i} className={styles.note}>{agentName(s.agent)} · {sourceLabel(s.source)}: “{s.quote}”</span>
          ))}
          <details className={styles.note}><summary>Chi tiết kỹ thuật (kiểm toán)</summary>{sources.map((s, i) => <div key={i}>{s.source}: {s.raw_quote ?? s.quote}</div>)}</details>
        </div>
      )}
      {c.state === 'Pending Approval' && <span className={styles.note}>Đang chờ người có thẩm quyền xác nhận; agent không tự phê duyệt.</span>}
    </div>
  );
}
