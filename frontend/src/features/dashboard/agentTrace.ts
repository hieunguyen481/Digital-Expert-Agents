import { fmtSec } from '@/utils/format';
import type { AgentCaseEvent } from '@/services/agentCaseService';

export const AGENT_NAME: Record<string, string> = {
  planner: 'Planner (điều phối)',
  credit: 'Credit',
  compliance: 'Compliance',
  operations: 'Operations',
  validation: 'Validation',
  document: 'Document',
  orchestrator: 'Hệ thống điều phối',
  system: 'Hệ thống',
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
const PURPOSE_LABEL: Record<string, string> = {
  WORKING_CAPITAL: 'Vốn lưu động', HOME_PURCHASE: 'Mua nhà', INVESTMENT: 'Đầu tư', TRADE_FINANCE: 'Tài trợ thương mại',
};
/** Mục đích vay hiển thị cho người dùng; mã chưa có nhãn thì giữ nguyên (văn bản người nhập như "test"). */
/** Ca kiểm thử: không gắn hồ sơ vay hoặc hồ sơ mẫu benchmark (HSV-2026-09xxx). Hồ sơ do cán bộ tạo (mã LA-) là hồ sơ thật, không ẩn (C3). */
export function isTestCase(c: { application_number?: string | null }): boolean {
  const no = c.application_number;
  return !no || /^HSV-\d{4}-09\d{3}$/.test(no);
}
export const purposeLabel = (p: string) => PURPOSE_LABEL[p] ?? p;
export const stateLabel = (s: string) => STATE_LABEL[s] ?? s;
/** Tông StatusPill theo trạng thái lượt: ok = đã có kết luận, warn = đang chờ người, bad = dừng/từ chối, ai = máy đang chạy. */
export const STATE_TONE: Record<string, 'neutral' | 'ok' | 'warn' | 'bad' | 'info' | 'ai'> = {
  Draft: 'neutral',
  'In Analysis': 'ai',
  'Pending Approval': 'warn',
  'Needs Info': 'warn',
  Escalated: 'info',
  Executing: 'info',
  Completed: 'ok',
  Rejected: 'bad',
};
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
  need_more_info: 'Cần bổ sung',
  flag: 'Đồng ý có điều kiện',
};

const CONDITION_TEXT = /điều kiện bổ sung|trước giải ngân|kèm điều kiện|có điều kiện/i;
/** Có điều kiện kèm theo: mảng `conditions` khác rỗng, hoặc câu tóm tắt nói điều kiện (Operations ghi điều kiện vào câu, không vào mảng). */
export const hasVerdictCondition = (v: { conditions?: string[]; summary?: string }): boolean =>
  !!v.conditions?.length || CONDITION_TEXT.test(v.summary ?? '');

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
  evidence?: { source: string; quote: string; raw_quote?: string }[];
  conditions?: string[];
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
      items.push({ id: e.id, from: 'planner', to: e.agent, kind: 'giao việc', text: str(p.objective) });
    } else if (e.type === 'task_finished') {
      const v = p.verdict as TraceVerdict | undefined;
      items.push({ id: e.id, from: e.agent, to: 'planner', kind: 'trả kết quả', text: v?.summary ?? '' });
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
  /** `agent`: chuyên gia tự chọn gọi; `system_compensation`: hệ thống gọi bù mục bắt buộc agent bỏ sót. */
  initiatedBy: string;
}

export const TOOL_LABEL: Record<string, string> = {
  get_business: 'Hồ sơ doanh nghiệp (KYB)',
  get_financials: 'Báo cáo tài chính các năm',
  get_existing_loans: 'Khoản vay hiện hữu',
  get_cic_status: 'Tra cứu CIC',
  check_blacklist: 'Tra danh sách đen/trừng phạt',
  get_collateral: 'Tài sản bảo đảm',
  get_annual_inflow: 'Tiền về tài khoản 12 tháng',
  get_bank_exposure: 'Dư nợ tại ngân hàng',
  create_loan_draft: 'Tạo bản nháp hồ sơ vay',
  get_audit_log: 'Nhật ký kiểm toán',
  get_loan_by_idempotency: 'Tra hồ sơ đã tạo',
};
export const toolLabel = (t: string) => TOOL_LABEL[t] ?? t;
/** Tên nguồn nghiệp vụ cho bảng dữ liệu/tệp corpus/khóa nội bộ (khớp agent_engine/common/labels.py SOURCE). */
const SOURCE_LABEL: Record<string, string> = {
  'customer.kyc_assessment': 'Đánh giá KYC của khách hàng', 'customer.customer': 'Hồ sơ khách hàng',
  'customer.organization_profile': 'Hồ sơ doanh nghiệp', 'customer.person_profile': 'Hồ sơ cá nhân',
  'credit.loan_account': 'Khoản vay hiện hữu', 'credit.customer_exposure': 'Tổng dư nợ của khách',
  'credit.collateral': 'Hồ sơ tài sản bảo đảm', 'credit.existing_obligation': 'Nghĩa vụ nợ hiện hữu',
  'credit.sme_financial_year': 'Báo cáo tài chính các năm', 'banking.credit_report': 'Báo cáo CIC',
  'banking.credit_facility': 'Hạn mức tín dụng hiện hữu', 'banking.account_holder': 'Chủ tài khoản',
  'banking.account_monthly_summary': 'Tiền về tài khoản theo tháng', 'banking.account': 'Tài khoản thanh toán',
  'document.extracted_field': 'Trường trích xuất từ tài liệu', 'document.document': 'Tài liệu hồ sơ',
  'document.document_version': 'Tài liệu hồ sơ', so_tinh_lai: 'Số tính lại từ công cụ',
  validation: 'Kiểm chứng', llm: 'Phân tích của chuyên gia',
  compliance_policy: 'Quy định tuân thủ nội bộ', ops_procedures: 'Quy trình vận hành nội bộ',
  shared_cs_td_sme_2025: 'Chính sách tín dụng SME 2025 (CS-TD-SME/2025)',
};
/** Nguồn trích dẫn -> tên nghiệp vụ; điều khoản chính sách (có §/Điều) giữ nguyên. Mã thô chỉ ở phần chi tiết kỹ thuật. */
export const sourceLabel = (s: string): string => {
  if (!s) return s;
  const parts = s.includes('+') && !s.includes('§') ? s.split('+').map((p) => p.trim()) : [s.trim()];
  const one = (p: string) => {
    const name = p.replace(/^core-banking:/, '').replace(/\.md$/, '');
    if (SOURCE_LABEL[name]) return SOURCE_LABEL[name];
    if (TOOL_LABEL[name]) return TOOL_LABEL[name].charAt(0).toUpperCase() + TOOL_LABEL[name].slice(1);
    if (/^(customer|credit|banking|document|agent|audit)\.[a-z_]+$/.test(name)) return 'Dữ liệu core banking';
    return p;
  };
  return Array.from(new Set(parts.map(one))).join(' + ');
};
/** Khóa trên bảng chung -> nhãn hiển thị (cùng nguồn với công cụ tương ứng). */
export const BOARD_LABEL: Record<string, string> = {
  business: 'Doanh nghiệp', financials: 'Báo cáo tài chính', loans: 'Khoản vay hiện hữu', cic: 'CIC',
  blacklist: 'Danh sách đen', collateral: 'Tài sản bảo đảm', inflow: 'Tiền về tài khoản',
};
export const APPROVER_LEVEL_LABEL: Record<string, string> = {
  branch_director: 'Giám đốc chi nhánh (cấp 1)', head_office_l2: 'Cấp 2 Hội sở', council: 'Hội đồng tín dụng',
};
export const approverLevelLabel = (l: string) => APPROVER_LEVEL_LABEL[l] ?? l;
export function toolCalls(events: AgentCaseEvent[]): ToolCall[] {
  return events
    .filter((e) => e.type === 'tool_call')
    .map((e) => ({
      id: e.id,
      agent: e.agent,
      tool: str(e.payload?.tool),
      outcome: str(e.payload?.outcome),
      durationMs: Number(e.payload?.duration_ms ?? 0),
      initiatedBy: str(e.payload?.initiated_by) || 'agent',
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
    else if (e.type === 'decided_on_loan') out.push({ id: e.id, label: 'Người có thẩm quyền đã quyết định trên hồ sơ', tone: 'ok', who: str(p.approver) });
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

export const fmtSeconds = (s: number) => fmtSec(s);

const FIELD_LABEL: Record<string, string> = {
  industry_risk: 'rủi ro ngành', collateral_id: 'tài sản bảo đảm', customer_id: 'khách hàng', loan_application_id: 'hồ sơ vay',
  business_id: 'doanh nghiệp', requested_amount: 'số tiền đề nghị', term_months: 'kỳ hạn', loan_purpose: 'mục đích vay',
};
/** Che mã nội bộ trong văn bản do Planner/agent sinh: UUID, tên trường kỹ thuật. Không đổi nghĩa câu. */
export function scrubInternal(text: string): string {
  return text
    .replace(/\bAI_OCR\b/g, 'AI trích xuất')
    .replace(/\bcompliance[_ ]policy\b/gi, 'Chính sách tuân thủ')
    .replace(/\b([a-z]+(?:_[a-z]+)*_id)\s+[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, (_m, f: string) => FIELD_LABEL[f] ?? f.replace(/_/g, ' '))
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '(mã nội bộ)')
    .replace(/\b[a-z]+(?:_[a-z]+)+\b/g, (f) => FIELD_LABEL[f] ?? f.replace(/_/g, ' '));
}

export interface BoardItem {
  id: number;
  scope: string;
  called: string[];
  compensated: string[];
  keys: string[];
  /** Công cụ đã dùng/bỏ qua cho hồ sơ này, kèm lý do (how: agent tự chọn | system gọi bù | skipped). */
  choices: { tool: string; how: string; reason: string }[];
}
/** Bảng chung: mỗi lần chuyên gia gom xong dữ liệu, khóa nào do agent gọi, khóa nào hệ thống gọi bù. */
export function sharedBoards(events: AgentCaseEvent[]): BoardItem[] {
  const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  return events.filter((e) => e.type === 'shared_board_updated').map((e) => ({
    id: e.id, scope: str(e.payload?.scope) || e.agent,
    called: arr(e.payload?.called_by_agent), compensated: arr(e.payload?.compensated), keys: arr(e.payload?.board_keys),
    choices: (Array.isArray(e.payload?.choices) ? e.payload.choices : []).map((c: Record<string, unknown>) => ({
      tool: str(c.tool), how: str(c.how), reason: str(c.reason),
    })),
  }));
}

export interface ValidationView {
  /** Các phép tính lại do hệ thống (không phải AI) thực hiện từ dữ liệu công cụ. */
  lines: string[];
  issues: string[];
  narrative: string;
  challenges: number;
  handled: number;
}
/** Validation kiểm chứng: số tính lại bởi hệ thống, vấn đề phát hiện, lời diễn giải do AI viết, số lần phản biện. */
export function validationView(events: AgentCaseEvent[]): ValidationView | null {
  const done = [...events].reverse().find((e) => e.type === 'task_finished' && e.agent === 'validation');
  if (!done) return null;
  const v = (done.payload?.verdict ?? {}) as { data?: Record<string, unknown> };
  const data = v.data ?? {};
  const strs = (x: unknown) => (Array.isArray(x) ? x.filter((i): i is string => typeof i === 'string') : []);
  const verified = (data.verified ?? {}) as { lines?: unknown };
  const numeric = typeof data.numeric_challenges === 'number' ? data.numeric_challenges : 0;
  return {
    lines: strs(verified.lines), issues: strs(data.issues), narrative: str(data.narrative),
    // đối chất giữa chuyên gia + phản biện số liệu (số chuyên gia nêu lệch số Validation tính lại)
    challenges: events.filter((e) => e.type === 'a2a_challenge').length + numeric,
    handled: events.filter((e) => e.type === 'challenge_handled').length + numeric,
  };
}

export interface RealAction {
  id: number;
  workflowStatus: string;
  state: string;
}
/** Hành động thật: bước `decide` của workflow đã chạy (engine ghi lại trạng thái hồ sơ sau quyết định). */
export function realActions(events: AgentCaseEvent[]): RealAction[] {
  return events
    .filter((e) => e.type === 'state_changed' && typeof e.payload?.workflow_status === 'string')
    .map((e) => ({ id: e.id, workflowStatus: str(e.payload?.workflow_status), state: str(e.payload?.state) }));
}

const CAPS_TAG = /^([A-ZÀ-ỴĐ][A-ZÀ-ỴĐ/ ]{3,}[A-ZÀ-ỴĐ]):\s+([\s\S]*)$/;
const sentenceCase = (t: string) => { const l = t.toLowerCase(); return l.charAt(0).toUpperCase() + l.slice(1); };

/** Tách theo dấu phân cách ở ngoài ngoặc đơn. */
function splitTop(t: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0; let cur = '';
  for (const ch of t) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === sep && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

export interface AiTextParts {
  /** Nhãn chữ hoa ở đầu ("CẦN BỔ SUNG:") đã hạ thành câu thường, dùng làm chip. */
  tag?: string;
  /** Mệnh đề dẫn trước danh sách ("thiếu dữ liệu chặn"). */
  lead?: string;
  /** Các ý tách bằng ";" hoặc "—"; một ý thì là câu thường. */
  items: string[];
}
const dash = (x: string) => x.replace(/\s+[—–]\s+/g, ', ').replace(/^[\s—–-]+/, '').replace(/[\s.;:,]+$/, '').trim();

/** Chuỗi bị cắt giữa chữ ("… dư n"): bỏ mảnh cuối một chữ cái rồi lùi về ranh giới câu hoặc ý gần nhất. */
export function trimDangling(t: string): string {
  if (!/\s[a-zà-ỵđ]$/u.test(t) || /\s[aàáạoôơeéêiíuúưyý]$/u.test(t)) return t;
  const base = t.replace(/\s[a-zà-ỵđ]$/u, '').replace(/[\s,;:]+$/, '');
  const cut = Math.max(base.lastIndexOf('. '), base.lastIndexOf('; '));
  return (cut > 20 ? base.slice(0, cut) : base).replace(/[\s.;:,]+$/, '');
}
/** Một dòng chữ AI (tiêu đề cờ, căn cứ, trích nguồn): bỏ mã kỹ thuật, "vs", "hit", "#", từ lặp liền nhau, "(trang N)" gộp vào nguồn đứng trước. */
export function cleanAiLine(raw: string): string {
  let t = scrubInternal(raw ?? '')
    .replace(/^[\s#]+/, '').replace(/\s+#{1,6}\s+/g, ' ')
    .replace(/\s+vs\.?\s+/gi, ' so với ')
    .replace(/\bhit\b/gi, 'kết quả trùng')
    .replace(/\s+[—–]\s+/g, ', ')
    .replace(/\s*\(\s*(trang\s+\d+)\s*\)/gi, ', $1')
    .replace(/\.{3,}/g, '…').replace(/([)\]”"])\.,/g, '$1,').replace(/(?<=\p{L}|\d)\.,/gu, ',');
  for (let i = 0; i < 3; i += 1) t = t.replace(/(^|[\s(])(\p{L}{2,})\s+\2(?=[\s.,;:)]|$)/giu, '$1$2');
  return trimDangling(t.replace(/\s{2,}/g, ' ').trim());
}
/** Trích nguồn hiển thị. */
export const quoteText = (q: string): string => cleanAiLine(q);
const foldPlain = (x: string) => x.toLowerCase().replace(/[\s.…,:;"“”-]+/g, ' ').trim();
/** Trích nguồn đứng sau nhãn nguồn: đoạn trích bắt đầu bằng chính nhãn thì bỏ phần lặp; chỉ còn dấu lửng thì trả chuỗi rỗng. */
export function quoteAfterLabel(label: string, quote: string): string {
  const q = quoteText(quote);
  const l = foldPlain(label);
  let out = q;
  if (l.length >= 4 && foldPlain(q).startsWith(l)) {
    let i = 0; let j = 0; const lc = label.replace(/[\s.…,:;"“”-]+/g, ' ').trim().toLowerCase();
    // cắt đúng phần đầu của q tương ứng với nhãn (so khớp từng ký tự, bỏ qua dấu câu và khoảng trắng)
    const qq = q.toLowerCase();
    while (i < qq.length && j < lc.length) {
      if (/[\s.…,:;"“”-]/.test(qq[i])) { i += 1; if (lc[j] === ' ') j += 1; continue; }
      if (qq[i] === lc[j]) { i += 1; j += 1; } else { break; }
    }
    out = q.slice(i).replace(/^[\s.…,:;"“”—–-]+/, '').trim();
  }
  return /^[\s.…]*$/.test(out) ? '' : out;
}
const upFirst = (x: string) => (x ? x.charAt(0).toLocaleUpperCase('vi') + x.slice(1) : x);
const NEED_INFO = /^Cần bổ sung\s+([^:;]{3,60}):\s*([\s\S]*)$/i;
const wordCount = (x: string) => x.split(/\s+/).filter(Boolean).length;

/** Văn bản do agent sinh: bỏ "— " đầu, đổi nhãn đầu câu thành chip, tách thành gạch đầu dòng chỉ khi các mảnh là ý độc lập. */
export function parseAiText(raw: string): AiTextParts {
  let t = scrubInternal(raw ?? '').replace(/^[\s—–-]+/, '').trim();
  t = t.replace(/\s+vs\.?\s+/gi, ' so với ').replace(/\bhit\b/gi, 'kết quả trùng').replace(/^#+\s*/, '');
  t = trimDangling(t);
  // Câu "… hiện tính được/ghi nhận (là) 0 đồng" là số máy móc khi chưa đủ điều kiện, không nói thêm gì.
  t = t.replace(/\s*[A-ZÀ-Ỵa-zà-ỵ][^.;:]*hiện (?:tại|tính được|ghi nhận)(?: là)?:?\s*0\s*(?:đồng|VND|₫)?\.?\s*$/u, '').trim();
  t = t.replace(/\.{3,}/g, '…');
  let tag: string | undefined;
  let lead: string | undefined;
  const m = t.match(CAPS_TAG);
  if (m) { tag = sentenceCase(m[1]); t = m[2]; }
  const n = !m ? t.match(NEED_INFO) : null;
  if (n) { tag = 'Cần bổ sung'; lead = upFirst(n[1].trim()); t = n[2]; }
  let segs = splitTop(t, ';');
  // Chỉ tách ";" khi mỗi mảnh đủ dài và mảnh sau không phải phần nối tiếp ("chưa…", "cần…", "hoàn tất…").
  const independent = segs.length > 1 && segs.every((x) => wordCount(x) >= 6) && segs.slice(1).every((x) => !/^\p{Ll}/u.test(x));
  if (!independent) segs = [t.trim()].filter(Boolean);
  if (independent && !lead) {
    const i = segs[0].indexOf(' — ');
    if (i > 0 && i <= 40) { lead = upFirst(segs[0].slice(0, i).trim()); segs[0] = segs[0].slice(i + 3); }
  }
  const items = segs.map(dash).filter(Boolean).map(upFirst);
  if (lead) lead = lead.replace(/dữ liệu chặn/i, 'dữ liệu bắt buộc');
  if (items.length === 1 && !lead) return { tag, items: [items[0]] };
  return { tag, lead, items };
}

const fold = (x: string) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
const cite = (x: string) => (x.match(/\(([^()]*§[^()]*)\)/)?.[1] ?? '').replace(/\s+/g, '');
const tokens = (x: string) => new Set(fold(x.replace(/\([^()]*\)/g, ' ')).split(/[^a-z0-9]+/).filter((w) => w.length > 2));
/** Gộp điều kiện trùng ý: cùng trích dẫn điều khoản, hoặc phần lớn từ khóa của ý ngắn nằm trong ý dài. Giữ ý đầu tiên. */
export function dedupeConditions(list: string[]): string[] {
  const kept: { text: string; cite: string; tok: Set<string> }[] = [];
  for (const raw of list) {
    const text = raw.trim();
    const cur = { text, cite: cite(text), tok: tokens(text) };
    const dup = kept.some((k) => {
      if (fold(k.text) === fold(text)) return true;
      if (cur.cite && cur.cite === k.cite) return true;
      const [a, b] = k.tok.size <= cur.tok.size ? [k.tok, cur.tok] : [cur.tok, k.tok];
      if (a.size < 3) return false;
      let hit = 0; a.forEach((w) => { if (b.has(w)) hit += 1; });
      return hit / a.size >= 0.5;
    });
    if (!dup) kept.push(cur);
  }
  return kept.map((k) => k.text);
}

/** Ý chỉ nêu số hiện trạng ("… hiện tại: 0 đồng"): không bảo ai làm gì nên không phải yêu cầu bổ sung. */
const STATUS_ONLY = /hiện (?:tại|tính được|ghi nhận)(?: là)?:?\s*[\d.,]+\s*(?:đồng|VND|₫|%|tỷ(?: đồng)?)?\s*\.?$/iu;
/** Động từ quy trình chung và từ nối: một ý chỉ gồm các từ này (không nêu tài liệu hay đối tượng cụ thể) là mảnh câu, không phải việc cần làm. */
const GENERIC_WORDS = new Set(['hoan', 'thien', 'doi', 'chieu', 'kiem', 'tra', 'ra', 'soat', 'xem', 'xet', 'hoan', 'tat', 'xac', 'nhan', 'truoc', 'khi', 'quyet', 'dinh', 'trinh', 'phe', 'duyet', 'cac', 'day', 'du', 'va', 'de', 'cap', 'tiep', 'tuc', 'ho', 'so', 'thong', 'tin', 'viec']);
const isFragment = (x: string): boolean => {
  const w = fold(x).split(/[^a-z0-9]+/).filter(Boolean);
  return w.length > 0 && w.every((k) => GENERIC_WORDS.has(k));
};
/** Danh sách điều kiện/yêu cầu bổ sung cho người đọc: bỏ ý chỉ nêu số hiện trạng và mảnh câu chung chung, rồi gộp ý trùng. */
export function cleanConditionList(list: string[]): string[] {
  return dedupeConditions(list.filter((x) => x.trim() && !STATUS_ONLY.test(x.trim().replace(/[\s.;]+$/, '')) && !isFragment(x)));
}

export interface FindingGroup<T> { agents: string[]; item: T }
/** Gộp phát hiện của các chuyên gia khi nội dung gần như trùng nhau: giữ một, ghi tên các agent cùng nêu. */
export function groupDuplicateFindings<T extends { agent: string; summary: string }>(list: T[]): FindingGroup<T>[] {
  const out: { agents: string[]; item: T; tok: Set<string> }[] = [];
  for (const item of list) {
    const tok = tokens(cleanAiLine(item.summary));
    const hit = out.find((o) => {
      const [a, b] = o.tok.size <= tok.size ? [o.tok, tok] : [tok, o.tok];
      if (a.size < 5) return false;
      let n = 0; a.forEach((w) => { if (b.has(w)) n += 1; });
      return n / a.size >= 0.7;
    });
    if (hit) { if (!hit.agents.includes(item.agent)) hit.agents.push(item.agent); } else out.push({ agents: [item.agent], item, tok });
  }
  return out.map(({ agents, item }) => ({ agents, item }));
}

/** Kết luận khi gói đề xuất không có `recommendation` (lượt dừng ở "Cần bổ sung", bị từ chối, chuyển cấp): một dòng tiêu đề, kèm tối đa 3 việc cần bổ sung dựng từ ý các chuyên gia cần thêm thông tin. */
export function fallbackConclusion(state: string, verdicts: TraceVerdict[]): { headline: string; items: string[] } | null {
  if (state === 'Needs Info') {
    const items: string[] = [];
    for (const v of verdicts.filter((x) => x.decision === 'need_more_info')) {
      const raw = v.conditions?.length ? v.conditions[0] : v.summary;
      const first = parseAiText(raw).items[0] ?? '';
      const one = cleanAiLine(first.split(/\.\s+/)[0]).replace(/[\s.;:,]+$/, '').trim();
      if (one && !items.some((x) => x.toLowerCase() === one.toLowerCase())) items.push(one);
    }
    const shown = cleanConditionList(items).slice(0, 3).map(upFirst);
    return shown.length
      ? { headline: `AI đề xuất: cần bổ sung ${shown.length} việc trước khi quyết định`, items: shown }
      : { headline: 'AI đề xuất: cần bổ sung thông tin trước khi quyết định', items: [] };
  }
  if (state === 'Rejected') return { headline: 'AI đề xuất: từ chối hồ sơ', items: [] };
  if (state === 'Escalated') return { headline: 'AI đề xuất: chuyển cấp có thẩm quyền cao hơn xem xét', items: [] };
  return null;
}
