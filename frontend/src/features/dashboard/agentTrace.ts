import type { AgentCaseEvent } from '@/services/agentCaseService';

export const AGENT_NAME: Record<string, string> = {
  planner: 'Planner',
  credit: 'Credit',
  compliance: 'Compliance',
  operations: 'Operations',
  validation: 'Validation',
  document: 'Document',
  orchestrator: 'Điều phối',
  gateway: 'Cổng',
  hitl: 'Người xác nhận',
  sla: 'SLA',
};
export const agentName = (a: string) => AGENT_NAME[a] ?? a;

export const STATE_LABEL: Record<string, string> = {
  Draft: 'Nháp',
  'In Analysis': 'Đang phân tích',
  'Pending Approval': 'Chờ xác nhận',
  'Needs Info': 'Cần bổ sung',
  Escalated: 'Đã chuyển cấp',
  Executing: 'Đang thực thi',
  Completed: 'Hoàn thành',
  Rejected: 'Bị từ chối',
};
export const stateLabel = (s: string) => STATE_LABEL[s] ?? s;
export const STATE_COLOR: Record<string, string> = {
  Draft: 'default',
  'In Analysis': 'processing',
  'Pending Approval': 'gold',
  'Needs Info': 'orange',
  Escalated: 'red',
  Executing: 'processing',
  Completed: 'green',
  Rejected: 'red',
};

export const DECISION_LABEL: Record<string, string> = {
  approve: 'Đồng ý',
  reject: 'Từ chối',
  pass: 'Đạt',
  fail: 'Không đạt',
  need_more_info: 'Cần thêm thông tin',
};

export interface PlanTask {
  task_id: string;
  agent: string;
  objective: string;
  depends_on: string[];
}
export type TaskState = 'waiting' | 'running' | 'done' | 'error';
export interface TraceVerdict {
  agent: string;
  decision: string;
  summary: string;
  evidence?: { source: string; quote: string }[];
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

export function latestPlan(events: AgentCaseEvent[]): { tasks: PlanTask[]; rationale: string } | null {
  const e = [...events].reverse().find((x) => x.type === 'plan_created');
  const tasks = e?.payload?.tasks as PlanTask[] | undefined;
  if (!e || !Array.isArray(tasks)) return null;
  return {
    tasks: tasks.map((t) => ({ ...t, depends_on: t.depends_on ?? [] })),
    rationale: str(e.payload?.rationale),
  };
}

/** Trạng thái từng task suy ra từ sự kiện thật (started/finished/agent_error) của lần lập kế hoạch gần nhất. */
export function taskStates(events: AgentCaseEvent[], tasks: PlanTask[]) {
  const planIdx = events.map((e) => e.type).lastIndexOf('plan_created');
  const recent = events.slice(planIdx < 0 ? 0 : planIdx);
  return Object.fromEntries(
    tasks.map((t) => {
      const mine = recent.filter((e) => str(e.payload?.task_id) === t.task_id);
      const finished = [...mine].reverse().find((e) => e.type === 'task_finished');
      const state: TaskState = mine.some((e) => e.type === 'agent_error')
        ? 'error'
        : finished
          ? 'done'
          : mine.some((e) => e.type === 'task_started')
            ? 'running'
            : 'waiting';
      return [t.task_id, { state, verdict: finished?.payload?.verdict as TraceVerdict | undefined }];
    }),
  ) as Record<string, { state: TaskState; verdict?: TraceVerdict }>;
}

/** Cấp (cột) của DAG: task không phụ thuộc ở cấp 0, còn lại = max(cấp phụ thuộc) + 1. */
export function dagLevels(tasks: PlanTask[]): PlanTask[][] {
  const level: Record<string, number> = {};
  const calc = (t: PlanTask, seen: Set<string>): number => {
    if (level[t.task_id] !== undefined) return level[t.task_id];
    if (seen.has(t.task_id)) return 0;
    seen.add(t.task_id);
    const deps = t.depends_on.map((d) => tasks.find((x) => x.task_id === d)).filter(Boolean) as PlanTask[];
    return (level[t.task_id] = deps.length ? Math.max(...deps.map((d) => calc(d, seen))) + 1 : 0);
  };
  tasks.forEach((t) => calc(t, new Set()));
  const out: PlanTask[][] = [];
  tasks.forEach((t) => (out[level[t.task_id]] ??= []).push(t));
  return out.filter(Boolean);
}

export interface FlowItem {
  id: number;
  from: string;
  to: string;
  kind: 'giao việc' | 'challenge' | 'hỏi thông tin' | 'phản hồi' | 'trả kết quả' | 'điều chỉnh sau challenge';
  text: string;
}

/** Luồng phối hợp: giao việc, trả kết quả, challenge của Validation, hỏi/đáp giữa các agent. */
export function collaboration(events: AgentCaseEvent[]): FlowItem[] {
  const items: FlowItem[] = [];
  for (const e of events) {
    const p = e.payload ?? {};
    if (e.type === 'task_started') {
      items.push({ id: e.id, from: 'orchestrator', to: e.agent, kind: 'giao việc', text: str(p.objective) });
    } else if (e.type === 'task_finished') {
      const v = p.verdict as TraceVerdict | undefined;
      items.push({ id: e.id, from: e.agent, to: 'orchestrator', kind: 'trả kết quả', text: v?.summary ?? '' });
    } else if (e.type.startsWith('a2a_')) {
      const inner = (p.payload ?? {}) as Record<string, unknown>;
      const kind =
        e.type === 'a2a_challenge'
          ? 'challenge'
          : e.type === 'a2a_info_request'
            ? 'hỏi thông tin'
            : 'phản hồi';
      const text =
        kind === 'challenge' ? str(inner.reason) : kind === 'hỏi thông tin' ? `Cần: ${str(inner.field)}` : '';
      items.push({ id: e.id, from: e.agent, to: str(p.to), kind, text });
    } else if (e.type === 'challenge_handled') {
      const v = p.verdict as TraceVerdict | undefined;
      items.push({ id: e.id, from: e.agent, to: 'validation', kind: 'điều chỉnh sau challenge', text: v?.summary ?? '' });
    }
  }
  return items;
}

export interface ToolCall {
  id: number;
  agent: string;
  tool: string;
  outcome: string;
  durationMs: number;
}
export function toolCalls(events: AgentCaseEvent[]): ToolCall[] {
  return events
    .filter((e) => e.type === 'tool_call')
    .map((e) => ({
      id: e.id,
      agent: e.agent,
      tool: str(e.payload?.tool),
      outcome: str(e.payload?.outcome),
      durationMs: Number(e.payload?.duration_ms ?? 0),
    }));
}

export function llmUsage(events: AgentCaseEvent[]) {
  const u = events.filter((e) => e.type === 'llm_usage');
  if (!u.length) return null;
  const costs = u.map((e) => e.payload?.cost_usd).filter((c): c is number => typeof c === 'number');
  return {
    calls: u.length,
    tokens: u.reduce(
      (s, e) => s + Number(e.payload?.prompt_tokens ?? 0) + Number(e.payload?.completion_tokens ?? 0),
      0,
    ),
    cost: costs.length ? costs.reduce((a, b) => a + b, 0) : null,
  };
}

export interface DecisionItem {
  id: number;
  label: string;
  tone: 'ok' | 'warn' | 'error';
  who?: string;
  text?: string;
}
/** Quyết định của người có thẩm quyền (HITL) và các lần engine từ chối thực thi. */
export function decisions(events: AgentCaseEvent[]): DecisionItem[] {
  const out: DecisionItem[] = [];
  for (const e of events) {
    const p = e.payload ?? {};
    if (e.type === 'approved') out.push({ id: e.id, label: 'Đã xác nhận phê duyệt', tone: 'ok', who: str(p.approver) });
    else if (e.type === 'rejected') out.push({ id: e.id, label: 'Bị từ chối', tone: 'error', who: str(p.approver), text: str(p.reason) });
    else if (e.type === 'commit_refused') out.push({ id: e.id, label: 'Hệ thống từ chối thực thi', tone: 'warn', who: str(p.approver), text: str(p.message) });
    else if (e.type === 'sla_escalated' || e.type === 'sla_reminder') out.push({ id: e.id, label: 'Nhắc/chuyển cấp do quá hạn', tone: 'warn', text: str(p.message) });
  }
  return out;
}

export function packageOf(events: AgentCaseEvent[]) {
  const e = [...events].reverse().find((x) => x.type === 'approval_package_ready');
  return (e?.payload?.package ?? null) as
    | { verdicts?: TraceVerdict[]; recommendation?: string; proposed_limit?: number; required_approver_level?: string; conditions?: string[] }
    | null;
}

export const fmtSeconds = (s: number) => (s < 60 ? `${s.toFixed(1)} giây` : `${(s / 60).toFixed(1)} phút`);
