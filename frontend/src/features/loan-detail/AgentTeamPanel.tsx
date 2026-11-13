import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Skeleton } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { ActionButton, AGENTS, AgentTeam, AiBlock, StatusPill, type AgentKey, type AgentState, type PillTone } from '@/components/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { normalizeError } from '@/services/apiClient';
import {
  TERMINAL_STATES, getAgentCase, getAgentCaseEvents, streamAgentCase, type AgentCaseEvent,
} from '@/services/agentCaseService';
import {
  agentName, cleanAiLine, scrubInternal, approverLevelLabel, latestPlan, packageOf, sourceLabel, stateLabel, taskStates, type TraceVerdict,
  DECISION_LABEL, quoteAfterLabel, cleanConditionList, groupDuplicateFindings, fallbackConclusion,
} from '@/features/dashboard/agentTrace';
import { ActionProposals } from '@/features/agent-actions/ActionProposals';
import { AiText } from '@/features/dashboard/components/AiText';
import { VerdictChip } from '@/features/dashboard/components/VerdictChip';
import { fetchAgentRuns, startAgentRun } from './loanDetailService';
import { fmtDate, fmtMoney } from './format';
import styles from './loan-detail.module.css';

const TASK_TO_STATE: Record<string, AgentState> = { waiting: 'idle', running: 'run', done: 'done', error: 'err' };

/** Trạng thái từng agent theo kế hoạch của lượt chạy gần nhất; chưa có lượt chạy thì tất cả "chưa chạy". */
export function agentStates(tasks?: Array<{ task_id: string; agent: string }>, states?: Record<string, { state: string }>): Partial<Record<AgentKey, AgentState>> {
  const out: Partial<Record<AgentKey, AgentState>> = {};
  if (!tasks) return out;
  for (const a of AGENTS) {
    const ts = tasks.filter((t) => t.agent === a.key);
    if (ts.length === 0) { out[a.key] = a.key === 'planner' ? 'done' : 'idle'; continue; }
    const st = ts.map((t) => TASK_TO_STATE[states?.[t.task_id]?.state ?? 'waiting'] ?? 'idle');
    out[a.key] = st.includes('err') ? 'err' : st.every((x) => x === 'done') ? 'done' : st.some((x) => x === 'run' || x === 'done') ? 'run' : 'idle';
  }
  return out;
}

const TASK_LABEL = { waiting: 'Chờ', running: 'Đang chạy', done: 'Xong', error: 'Lỗi' } as const;

/** Trạng thái hồ sơ đang ở tay người quyết định cuối. */
const DECIDER_STATUSES = ['APPROVAL', 'COMMITTEE', 'COUNCIL_SESSION'];

export const AGENT_RUN_TIMEOUT_MS = 5 * 60_000;

/** Đội agent trên hồ sơ thật: chạy, theo dõi qua SSE, xem đề xuất. AI chỉ đề xuất; người có thẩm quyền quyết định. */
export function AgentTeamPanel({ loanId, currency, status }: { loanId: string; currency: string; status?: string }) {
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

  const decider = 'Cấp phê duyệt';
  const runButton = data?.can_run && (
    <ActionButton testId="run-agent-team" variant={latest ? 'default' : 'ai'} size="small" loading={run.isPending} disabled={inProgress} onClick={() => run.mutate()}
      title={inProgress ? 'Đội agent đang chạy, chờ kết thúc rồi mới chạy lại' : undefined}>
      {inProgress ? 'Đội agent đang chạy…' : latest ? 'Chạy lại đội agent' : 'Chạy đội agent'}
    </ActionButton>
  );
  return (
    <div id="doi-agent" data-testid="agent-team" role="region" aria-label="Đội agent" className={styles.stack}>
      <AiBlock title="Kết luận của đội agent" tag="AI đề xuất – chưa xác nhận" actions={runButton || undefined}>
        <div className={styles.run}>
          {!latest && <AgentTeam variant="compact" human={{ who: decider }} />}
          {runsQ.isError && (
            <Alert type="error" showIcon message="Không tải được trạng thái đội agent"
              description={normalizeError(runsQ.error).message}
              action={<Button size="small" onClick={() => void runsQ.refetch()}>Thử lại</Button>} />
          )}
          {runsQ.isLoading && <Skeleton active paragraph={{ rows: 2 }} />}
          {data && !data.can_run && data.deny_reason && (
            <span className={styles.note} data-testid="agent-team-lock">
              <LockOutlined aria-hidden /> <b>Chỉ xem.</b> {data.deny_reason.replace(/^\s*chỉ xem[.:,]?\s*/i, '')}
            </span>
          )}
          {run.isError && (
            <Alert type="error" showIcon data-testid="agent-run-error" message={normalizeError(run.error).message} />
          )}
          {data && !latest && (data.can_run || (!!status && DECIDER_STATUSES.includes(status))) && (
            <span className={styles.note} data-testid="agent-team-empty">
              {status && DECIDER_STATUSES.includes(status)
                ? 'Hồ sơ chưa có lượt chạy đội agent. Người quyết định xem chỉ số và tài liệu bên dưới.'
                : 'Chưa chạy đội agent trên hồ sơ này.'}
            </span>
          )}
          {overdue && (
            <Alert type="warning" showIcon data-testid="agent-run-timeout"
              message="Lượt chạy quá 5 phút chưa kết thúc"
              description="Đội agent có thể đang xử lý chậm hoặc đã dừng giữa chừng. Bấm cập nhật để kiểm tra lại; nếu engine ngừng cập nhật, hệ thống tự mở khóa để chạy lại sau 20 phút kể từ cập nhật cuối."
              action={<Button size="small" onClick={() => void latestCaseQ.refetch()}>Cập nhật trạng thái</Button>} />
          )}
          {latest && <RunBody key={latest.case_id} caseId={latest.case_id} currency={currency} decider={decider} startedAt={latest.created_at} isDecider={!!status && DECIDER_STATUSES.includes(status)}
            retry={data?.can_run && !inProgress ? () => run.mutate() : undefined} retrying={run.isPending} />}
          {latest && <ActionProposals caseId={latest.case_id} loanId={loanId} />}
          {data && data.runs.length > 1 && (
            <div className={styles.stackTight} data-testid="agent-run-history">
              <b className={styles.sub}>Các lượt trước ({data.runs.length - 1})</b>
              {data.runs.slice(1).map((r) => (
                <span key={r.id} className={styles.note}>
                  {fmtDate(r.created_at)} · {r.started_by_name ?? '—'} · <Link to={`/dashboard?case=${r.case_id}`}>Xem dấu vết</Link>
                </span>
              ))}
            </div>
          )}
        </div>
      </AiBlock>
    </div>
  );
}

/** Chuỗi mở đầu viết hoa toàn bộ ("ĐỀ XUẤT PHÊ DUYỆT kèm…") đổi về câu thường để không quát vào mắt người đọc. */
export function softCaps(t: string): string {
  const m = t.match(/^([A-ZÀ-ỴĐ][A-ZÀ-ỴĐ ]{5,}[A-ZÀ-ỴĐ])(?=\s|$)/);
  if (!m) return t;
  const low = m[1].toLowerCase();
  return low.charAt(0).toUpperCase() + low.slice(1) + t.slice(m[1].length);
}

/** Tiêu đề kết luận chỉ là nhãn đề xuất: cắt trước phần điều kiện (đã có danh sách bên dưới), bỏ dấu câu thừa. */
export function conclusionHeadline(t: string): string {
  const head = t.split(/\s*(?:Điều kiện chính\s*:|—\s*lưu ý)/i)[0];
  return softCaps(head.replace(/[\s.;:,]+$/, '').trim());
}

/** Câu kết luận luôn mở bằng "AI đề xuất" (trừ khi chính câu đã nói "Đề xuất …"). */
export const aiLead = (h: string): string => (/^(AI\s+)?đề xuất/i.test(h) ? h : `AI đề xuất: ${h.charAt(0).toLowerCase()}${h.slice(1)}`);

/** Một ý điều kiện: bỏ tiền tố "Điều kiện:", dấu câu đầu/cuối thừa. */
export const cleanCondition = (x: string): string => x.replace(/^[\s—–-]*(?:Điều kiện:\s*)?/i, '').replace(/[\s.;:,]+$/, '').replace(/\.{2,}/g, '.');

const fmtClock = (ms: number) => {
  const t = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

function RunBody({ caseId, currency, decider, startedAt, isDecider, retry, retrying }: { caseId: string; currency: string; decider: string; startedAt: string; isDecider: boolean; retry?: () => void; retrying?: boolean }) {
  const [tick, setTick] = useState(() => Date.now());
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
  useEffect(() => {
    if (finishedNow) return undefined;
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [finishedNow]);
  const [live, setLive] = useState<AgentCaseEvent[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamError, setStreamError] = useState(false);

  // Luồng SSE của engine không tự đóng khi ca đã kết thúc: chỉ giữ luồng khi ca còn chạy, kẻo trang giữ một kết nối mở mãi.
  useEffect(() => {
    if (finishedNow) return undefined;
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
  }, [caseId, qc, finishedNow]);

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

  const agentSt = agentStates(plan?.tasks, states);
  const failed = plan?.tasks.filter((t) => states[t.task_id]?.state === 'error') ?? [];
  const okAgents = plan?.tasks.filter((t) => states[t.task_id]?.state === 'done') ?? [];
  const startMs = Date.parse(startedAt);
  const fallback = finished && !pkg?.recommendation ? fallbackConclusion(c.state, verdicts) : null;
  const stateTone: Record<string, PillTone> = { Completed: 'ok', Rejected: 'bad', Escalated: 'bad', 'Pending Approval': 'human', 'Needs Info': 'warn' };
  return (
    <div className={styles.run} data-testid="agent-run" data-state={c.state}>
      {failed.length > 0 && (
        <Alert type="error" showIcon role="alert" data-testid="agent-run-failed"
          message={`${failed.map((t) => agentName(t.agent)).join(', ')} gặp lỗi khi chạy.`}
          description={`${okAgents.length > 0 ? `${okAgents.map((t) => agentName(t.agent)).join(', ')} đã xong và kết quả từng phần đã lưu, còn xem được trong tab Dấu vết. ` : ''}${pkg ? '' : 'Chưa có kết luận vì Validation chưa thể kiểm chứng. '}Dữ liệu hồ sơ không bị mất. Chạy lại đội agent; nếu vẫn lỗi, kiểm tra tài liệu ở mục Đối chiếu tài liệu.`}
          action={retry && <Button size="small" loading={retrying} onClick={retry}>Chạy lại đội agent</Button>} />
      )}
      {!finished && Number.isFinite(startMs) && (
        <Alert type="info" showIcon role="status" data-testid="agent-run-elapsed"
          message={<>Đã chạy <b className={styles.num}>{fmtClock(tick - startMs)}</b>. Thường mất vài phút. Bạn có thể rời trang, kết quả vẫn được lưu.</>} />
      )}
      {(pkg?.recommendation || pkg?.proposed_limit != null || fallback) && (
        <div className={styles.stackTight} data-testid="agent-recommendation">
          {pkg?.recommendation ? <p className={styles.concl}>{aiLead(conclusionHeadline(scrubInternal(pkg.recommendation)))}</p> : fallback && <p className={styles.concl} data-testid="agent-fallback-conclusion">{fallback.headline}</p>}
          {pkg?.proposed_limit != null && <span>Hạn mức đề xuất: <b className={styles.num}>{fmtMoney(String(pkg.proposed_limit), currency)}</b></span>}
          {pkg?.required_approver_level && <span className={styles.note}>Cấp phê duyệt đề xuất: {approverLevelLabel(pkg.required_approver_level)}</span>}
          {!pkg?.recommendation && !!fallback?.items.length && (
            <ul className={styles.condOl} data-testid="agent-fallback-items">{fallback.items.map((x) => <li key={x}>{x}</li>)}</ul>
          )}
          {!!pkg?.conditions?.length && (() => {
            const items = cleanConditionList(pkg.conditions.map((x) => cleanCondition(scrubInternal(x))));
            const list = <ul className={styles.condOl}>{items.map((x) => <li key={x}>{x}</li>)}</ul>;
            // Người quyết định cần kết luận 1–2 dòng: danh sách việc bổ sung gập sẵn, mở khi cần đọc.
            return isDecider
              ? <details className={styles.det} data-testid="agent-conditions"><summary>Yêu cầu bổ sung và điều kiện ({items.length})</summary>{list}</details>
              : <div data-testid="agent-conditions"><b className={styles.sub}>Yêu cầu bổ sung và điều kiện đội agent đề xuất</b>{list}</div>;
          })()}
          <span className={styles.note}>Đề xuất của đội agent chưa có hiệu lực.</span>
        </div>
      )}
      {finished && !pkg && !verdicts.length && (
        <Alert type="info" showIcon message={`Lượt chạy kết thúc ở trạng thái "${stateLabel(c.state)}" và chưa có gói đề xuất.`} />
      )}
      {verdicts.length > 0 && (
        <div className={styles.stackTight} data-testid="agent-findings">
          <b className={styles.sub}>{finished ? `Phát hiện của từng chuyên gia (${findings.length} cần chú ý)` : `${verdicts.length}/4 chuyên gia đã xong`}</b>
          {groupDuplicateFindings(verdicts).map(({ agents, item: v }, i) => (
            <span key={`${v.agent}-${i}`} className={styles.finding}>
              <VerdictChip v={v} />
              <b>{agents.length > 1 ? `${agents.map(agentName).join(' và ')} cùng nêu` : agentName(v.agent)}</b> <AiText text={v.summary} skipTag={DECISION_LABEL[v.decision]} />
            </span>
          ))}
        </div>
      )}
      <div className={styles.runHead}>
        <span data-testid="agent-run-state"><StatusPill tone={stateTone[c.state] ?? 'ai'}>{stateLabel(c.state)}</StatusPill></span>
        <span>
          {finished ? 'Đã kết thúc' : streamError ? 'Mất luồng trực tiếp, đang cập nhật định kỳ' : streaming ? '● Đang nhận cập nhật trực tiếp' : 'Đang cập nhật'}
          {` · ${events.length} sự kiện · `}
        </span>
        <Link to={`/dashboard?case=${caseId}`} data-testid="agent-trace-link">Xem dấu vết của lượt chạy</Link>
      </div>
      <div data-testid="agent-flow">
        <AgentTeam variant="compact" states={agentSt} human={{ who: decider }} />
        <details className={styles.det}>
          <summary>Xem sơ đồ đầy đủ</summary>
          <AgentTeam states={agentSt} human={{ who: decider, note: 'Người quyết định, ngoài khung AI · AI chỉ đề xuất' }} />
        </details>
      </div>
      {plan && (
        <div data-testid="agent-progress" className={styles.btnRow}>
          {plan.tasks.map((t) => {
            const st = states[t.task_id]?.state ?? 'waiting';
            return <StatusPill key={t.task_id} tone={st === 'done' ? 'ok' : st === 'running' ? 'ai' : st === 'error' ? 'bad' : 'neutral'}>
              {agentName(t.agent)}: {TASK_LABEL[st]}
            </StatusPill>;
          })}
        </div>
      )}
      {!plan && !finished && <span className={styles.note}>Đang chờ Planner lập kế hoạch…</span>}
      {sources.length > 0 && (
        <div className={styles.stackTight} data-testid="agent-sources">
          <b className={styles.sub}>Trích nguồn</b>
          {sources.map((s, i) => (
            <span key={i} className={styles.note}>{agentName(s.agent)} · {cleanAiLine(sourceLabel(s.source)).replace(/[\s:]+$/, '')}{quoteAfterLabel(cleanAiLine(sourceLabel(s.source)), s.quote) ? <>: “{quoteAfterLabel(cleanAiLine(sourceLabel(s.source)), s.quote)}”</> : null}</span>
          ))}
        </div>
      )}
      {c.state === 'Pending Approval' && <span className={styles.note}>Đang chờ người có thẩm quyền xác nhận; agent không tự phê duyệt.</span>}
    </div>
  );
}
