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
    // Khóa bảng chung viết thô ("Dữ kiện inflow", "inflow") -> tên nghiệp vụ của khóa đó
    const board = name.match(/^(?:(dữ kiện)\s+)?([a-z_]+)$/i);
    if (board && BOARD_LABEL[board[2].toLowerCase()]) {
      const b = BOARD_LABEL[board[2].toLowerCase()];
      return board[1] ? `${board[1].charAt(0).toUpperCase()}${board[1].slice(1)} ${/^[A-ZĐ]{2,}(?![a-zà-ỹ])/.test(b) ? b : b.charAt(0).toLowerCase() + b.slice(1)}` : b; // nhãn mở bằng chữ viết tắt (CIC, TSĐB) giữ nguyên hoa
    }
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
/** Cấp phê duyệt đã biết từ các dòng Validation tính lại ("cấp phê duyệt: Cấp 2 Hội sở"), dùng khi gói đề xuất chưa có (hồ sơ dừng ở "Cần bổ sung"). */
export function levelFromLines(lines: string[] | null | undefined): string | null {
  for (const l of lines ?? []) {
    const m = String(l ?? '').match(/cấp phê duyệt:\s*(Cấp \d+ Hội sở|Giám đốc chi nhánh(?: \(cấp \d\))?|Hội đồng tín dụng)/i);
    if (m) return m[1];
  }
  return null;
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
const SLA_LABEL = 'Nhắc/chuyển cấp do quá hạn';
/** Quyết định của người có thẩm quyền (HITL) và các lần engine từ chối thực thi. */
export function decisions(events: AgentCaseEvent[]): DecisionItem[] {
  const out: DecisionItem[] = [];
  for (const e of events) {
    const p = e.payload ?? {};
    if (e.type === 'approved') out.push({ id: e.id, label: 'Đã xác nhận phê duyệt', tone: 'ok', who: str(p.approver) });
    else if (e.type === 'decided_on_loan') out.push({ id: e.id, label: 'Người có thẩm quyền đã quyết định trên hồ sơ', tone: 'ok', who: str(p.approver) });
    else if (e.type === 'rejected') out.push({ id: e.id, label: 'Bị từ chối', tone: 'error', who: str(p.approver), text: str(p.reason) });
    else if (e.type === 'commit_refused') out.push({ id: e.id, label: 'Hệ thống từ chối thực thi', tone: 'warn', who: str(p.approver), text: str(p.message) });
    else if (e.type === 'sla_escalated' || e.type === 'sla_reminder') {
      // Nhắc và chuyển cấp do quá hạn gom một dòng (giữ lần mới nhất), không in hai chip cùng nhãn
      const at = out.findIndex((d) => d.label === SLA_LABEL);
      const item: DecisionItem = { id: e.id, label: SLA_LABEL, tone: 'warn', text: str(p.message) };
      if (at >= 0) out.splice(at, 1);
      out.push(item);
    }
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
  return humanizeGate(scrubBase(text));
}
/** Nhãn cổng viết hoa ("CẦN BỔ SUNG: …", "Kết luận: CẦN BỔ SUNG/ĐIỀU CHỈNH: …") thành chữ thường như người viết; từ mở câu (Chưa, Không, Thiếu…) sau dấu phẩy viết thường. */
export function humanizeGate(text: string): string {
  return text
    .replace(/(^|[.;:]\s+)([A-ZÀ-ỴĐ][A-ZÀ-ỴĐ/ ]{3,}[A-ZÀ-ỴĐ])(?=\s*[:—–])/g, (_m, pre: string, tag: string) => {
      const l = tag.toLowerCase();
      return pre + (pre === '' || /[.;]\s+$/.test(pre) ? l.charAt(0).toLocaleUpperCase('vi') + l.slice(1) : l);
    })
    // Nhãn chữ hoa đứng đầu câu không có dấu hai chấm ("ĐỀ XUẤT PHÊ DUYỆT với điều kiện…") hạ về chữ câu thường
    .replace(/(^|[.;]\s+)([A-ZÀ-ỴĐ]{2,}(?: [A-ZÀ-ỴĐ]{2,})+)(?=\s+[a-zà-ỹđ])/g, (m, pre: string, tag: string) => {
      // Chuỗi viết tắt lặp ("BCTC BCTC năm") không phải nhãn cổng
      if (new Set(tag.split(' ')).size < 2) return m;
      const l = tag.toLowerCase();
      return pre + l.charAt(0).toLocaleUpperCase('vi') + l.slice(1);
    })
    .replace(/,\s+(Chưa|Không|Thiếu|Cần|Đã|Còn|Chỉ)(?=\s)/g, (_m, w: string) => `, ${w.toLowerCase()}`);
}
const AGENT_WORDS = /(?<![\p{L}\d_.])(credit|compliance|operations|document|validation|planner)(?![\p{L}\d_]|\.\p{L})/gu;
/** Chữ AI hay lẫn tiếng Anh, tên agent viết thường, "0,0 tỷ" và biệt ngữ cổng ("chặn"): làm sạch theo loại, không theo câu. */
/** Số thập phân kiểu dấu chấm trong chữ AI ("DSCR = 1.34") hiện kiểu Việt Nam ("1,34"). Chỉ đổi số có 1–2 chữ số lẻ đứng riêng;
 *  không đụng số có nhiều dấu chấm (ngày, mã điều khoản 3.1.2), số đứng sau "§", "Điều/khoản/mục/điểm", hay dính chữ/mã (HSV-2026.1). */
const DOT_DECIMAL = /(?<![\p{L}\d_.,§-])(\d{1,3})\.(\d{1,2})(?![\d.]|\.\d|\p{L})/gu;
const CLAUSE_BEFORE = /(?:điều|khoản|mục|điểm|phần|chương|§|phụ lục|thông tư|nghị định|quyết định)\s*$/i;
export function decimalVi(text: string): string {
  return text.replace(DOT_DECIMAL, (m, a: string, b: string, off: number, whole: string) =>
    CLAUSE_BEFORE.test(whole.slice(Math.max(0, off - 14), off)) ? m : `${a},${b}`);
}
/** Mã quy tắc nội bộ ("Q4", "Q-M") lọt vào chữ AI: bỏ khỏi chữ hiển thị. "Q4/2026" (quý) giữ nguyên. */
const RULE = 'Q-?(?:[A-Z]|\\d{1,2})';
export function stripRuleCodes(text: string): string {
  return String(text ?? '')
    // "(§3.1, Q4)" -> "(§3.1)"; "(Q4)" -> ""
    .replace(new RegExp(`\\s*\\(\\s*${RULE}\\s*\\)`, 'g'), '')
    .replace(new RegExp(`\\s*,\\s*${RULE}(?![\\p{L}\\d/-]|\\.\\d)`, 'gu'), '')
    .replace(new RegExp(`\\s+theo\\s+${RULE}(?![\\p{L}\\d/-]|\\.\\d)`, 'gu'), '')
    .replace(/\(\s*,\s*/g, '(').replace(/\s+([.,;)])/g, '$1');
}
const TONED = /[ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸ]/;
/** Từ viết tắt hợp lệ trong chữ AI: không bao giờ hạ chữ thường. */
const ACRONYMS = new Set(['CIC', 'AML', 'KYC', 'KYB', 'BCTC', 'DSCR', 'LTV', 'EBITDA', 'SME', 'TSĐB', 'TCTD', 'OCR', 'AI', 'VND', 'HSV', 'LA', 'CS', 'TD',
  'DTI', 'ICR', 'KHDN', 'HĐQT', 'CCCD', 'CMND', 'PEP', 'NHNN', 'UBND', 'MST', 'TNHH', 'CP', 'VAT', 'NPL', 'ROE', 'ROA', 'CEO', 'HSTD', 'QHKH', 'HTTD', 'EMP', 'CIF', 'DEMO', 'PDF', 'API', 'SLA']);
/** Cụm từ in hoa liền nhau (mỗi từ ≥ 2 chữ cái): không dính mã ("CS-TD-SME", "HSV-2026-00187"), không đứng trước nhãn có dấu hai chấm. */
const SHOUT_RUN = /(?<![\p{L}\d_\-/.§])\p{Lu}{2,}(?:[ \t]+\p{Lu}{2,})*(?![\p{L}\d_/-]|\s+\p{Lu}|\s*[:—–])/gu;
/** Chữ in hoa nhấn mạnh ("VƯỢT ngưỡng", "ĐỀ XUẤT PHÊ DUYỆT", "KHÔNG ĐẠT") viết thường, kể cả không dấu; chữ cái đầu câu viết hoa đúng một chữ.
 *  Từ viết tắt hợp lệ (CIC, DSCR, TSĐB…) và một từ ASCII đứng riêng (có thể là từ viết tắt lạ) giữ nguyên. */
export function lowerShouting(text: string): string {
  return String(text ?? '').replace(SHOUT_RUN, (run: string, off: number, whole: string) => {
    const words = run.split(/[ \t]+/);
    const loud = words.filter((w) => !ACRONYMS.has(w));
    if (!loud.some((w) => TONED.test(w)) && loud.length < 2) return run;
    const startOfSentence = /(?:^|[.;!?]\s+|\n)[*_>#"“(\-\s]*$/.test(whole.slice(0, off));
    let first = true;
    return run.replace(/\p{Lu}{2,}/gu, (w) => {
      if (ACRONYMS.has(w)) { first = false; return w; }
      const l = w.toLowerCase();
      const out = first && startOfSentence ? l.charAt(0).toLocaleUpperCase('vi') + l.slice(1) : l;
      first = false;
      return out;
    });
  });
}
/** Số tiền ghi theo kiểu ứng dụng: "56,0 tỷ VND" -> "56 tỷ đồng" (bỏ ",0" thừa, "VND" đọc là "đồng"). */
export function moneyVi(text: string): string {
  return String(text ?? '')
    .replace(/(?<![\d.,])(\d{1,3}(?:\.\d{3})*|\d+),0{1,2}(?!\d)(?=\s*(?:tỷ|triệu|nghìn|đồng|VND|₫))/gu, '$1')
    .replace(/(\d|tỷ|triệu|nghìn)\s*(?:VND|₫)(?![\p{L}\d])/gu, '$1 đồng');
}
const REDUP = new Set(['song', 'dần', 'từng', 'ngày', 'người', 'năm', 'tháng', 'đều', 'nhà', 'nơi', 'khắp']);
function scrubStyle(text: string): string {
  return lowerShouting(stripRuleCodes(decimalVi(text)))
    // Dấu câu đôi do ghép mảnh: ".;" ";." ",." ";;" ",," ".."
    .replace(/\.\s*;/g, ';').replace(/;\s*\./g, '.').replace(/,\s*\./g, '.').replace(/;\s*;/g, ';').replace(/,\s*,/g, ',').replace(/(?<!\.)\.\.(?!\.)/g, '.')
    // Lặp nguyên một từ liền nhau do LLM sinh ("nêu nêu"): giữ một từ
    // (từ láy hợp lệ như "song song", "dần dần" giữ nguyên)
    .replace(/(?<![\p{L}\d])(\p{L}{2,})(?:[ \t]+\1)+(?![\p{L}\d])/giu, (m, w: string) => (REDUP.has(w.toLowerCase()) ? m : w))
    .replace(AGENT_WORDS, (w) => w.charAt(0).toUpperCase() + w.slice(1))
    .replace(/\b(c)hallenges?\b/gi, (_m, c: string) => (c === 'C' ? 'Phản biện' : 'phản biện'))
    // Ghi chú vận hành "(không chặn trình hồ sơ)" không nói thêm gì cho người đọc: bỏ cả cụm
    .replace(/\s*\(\s*không (?:chặn|cản trở) trình(?: hồ sơ)?\s*\)/gi, '')
    .replace(/\bdữ liệu chặn\b/gi, 'dữ liệu bắt buộc')
    .replace(/\bkhông chặn\b/gi, 'không cản trở')
    .replace(/\bchặn\b/g, 'cản trở')
    // "Không có dư nợ" thiếu phạm vi: dư nợ ở đây là dư nợ tại ngân hàng
    .replace(/(Không có dư nợ)(?!\s+tại)/g, '$1 tại ngân hàng')
    // "≤ 1,000 tỷ": dấu nghìn kiểu Anh trước đơn vị tiền đổi thành dấu chấm ("1.000 tỷ"); số thập phân thật (1,5 tỷ) giữ nguyên
    .replace(/(?<![\d.,])\d{1,3}(?:,\d{3})+(?!\d)(?=\s*(?:tỷ|triệu|nghìn|đồng|VND|₫))/gu, (n) => n.replace(/,/g, '.'))
    // "cấp Cấp 2 Hội sở" -> "Cấp 2 Hội sở"; cấp phê duyệt luôn viết hoa "Cấp N Hội sở"
    .replace(/\bcấp\s+(Cấp\s)/g, '$1')
    .replace(/(?<![\p{L}\d])cấp\s+(\d)\s+hội sở(?![\p{L}\d])/giu, 'Cấp $1 Hội sở')
    // Từ viết tắt lặp quanh một từ khác ("SME KHDN SME") giữ một lần
    .replace(/(?<![\p{L}\d])(\p{Lu}{2,})\s+(\p{Lu}{2,})\s+\1(?![\p{L}\d])/gu, '$1 $2')
    // Biệt ngữ vận hành: SLA, checkpoint, "cấp TD"
    .replace(/Quá SLA phê duyệt\s*[—–:-]\s*(.*?)giữ checkpoint/gi, 'Quá hạn phê duyệt: $1giữ nguyên bước hiện tại')
    .replace(/\bQuá SLA\b/g, 'Quá hạn')
    .replace(/\bgiữ checkpoint\b/gi, 'giữ nguyên bước hiện tại')
    .replace(/\bsau cấp TD\b/g, 'sau khi cấp tín dụng')
    // "inflow" thô trong thân chữ: tên nghiệp vụ của luồng tiền
    .replace(/(?<![\p{L}\d_.])([Ii])nflows?(?![\p{L}\d_])/gu, (_m, c: string) => (c === 'I' ? 'Tiền về tài khoản' : 'tiền về tài khoản'))
    // "80,0 tỷ" -> "80 tỷ đồng": bỏ ",0" thừa ở số tròn, thêm "đồng" sau "tỷ" khi thiếu (không đụng "tỷ lệ", "tỷ suất"…)
    .replace(/(?<![\d.,])(\d{1,3}(?:\.\d{3})*|\d+),0{1,2}(?!\d)(?=\s*(?:tỷ|triệu|nghìn))/gu, '$1')
    .replace(/(\d)\s*tỷ(?![\p{L}\d_])(?!\s*(?:đồng|VND|₫))/gu, '$1 tỷ đồng')
    // Dấu chấm dính dấu lửng ".…" do cắt câu: chỉ giữ dấu lửng
    .replace(/\.\s*…/g, '…')
    // "0,0 tỷ", "0 tỷ đồng" ghi "0 đồng"
    .replace(/(?<![\d.,])0(?:[.,]0+)?\s*tỷ(?:\s*đồng)?/gi, '0 đồng')
    // "Điều kiện tiên quyết trước khi trình cấp phê duyệt: … trước khi trình cấp phê duyệt": bỏ cụm ở nhãn khi nội dung đã có
    .replace(/(Điều kiện tiên quyết)\s+(trước khi trình cấp phê duyệt)(\s*:\s*[^.]*?\2)/gi, '$1$3');
}
function scrubBase(text: string): string {
  return scrubStyle(text)
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
const LOWER_AFTER_COMMA = /,\s+(Chưa|Không|Thiếu|Cần|Đã|Còn|Chỉ|Phải)(?=\s)/g;
const lowerAfterComma = (x: string) => x.replace(LOWER_AFTER_COMMA, (_m, w: string) => `, ${w.toLowerCase()}`);
const dash = (x: string) => lowerAfterComma(x.replace(/\s+[—–]\s+/g, ', ')).replace(/^[\s—–-]+/, '').replace(/[\s.;:,]+$/, '').trim();

/** Chuỗi bị cắt giữa chữ ("… dư n"): bỏ mảnh cuối một chữ cái rồi lùi về ranh giới câu hoặc ý gần nhất. */
export function trimDangling(t: string): string {
  if (!/\s[a-zà-ỵđ]$/u.test(t) || /\s[aàáạoôơeéêiíuúưyý]$/u.test(t)) return t;
  const base = t.replace(/\s[a-zà-ỵđ]$/u, '').replace(/[\s,;:]+$/, '');
  const cut = Math.max(base.lastIndexOf('. '), base.lastIndexOf('; '));
  return (cut > 20 ? base.slice(0, cut) : base).replace(/[\s.;:,]+$/, '');
}
/** Mệnh đề cuối "… hiện tại là 0 đồng", "… tối đa 0 đồng": số máy móc khi chưa đủ điều kiện, không nói thêm gì; bỏ mệnh đề, giữ phần đứng trước dấu ";". */
/** Đuôi lý do "do định giá chưa xác minh": nói vì sao số là 0, không bảo ai làm gì. */
const ZERO_WHY = '(?:\\s+(?:do|vì|bởi vì)\\s+[^.;:]*)?';
const ZERO_TAIL = `(?:hiện (?:tại|tính được|ghi nhận)(?: (?:là|bằng))?|tối đa):?\\s*0\\s*(?:đồng|VND|₫)?${ZERO_WHY}\\.?\\s*$`;
/** Chỉ cho mệnh đề nói về bảo đảm/hạn mức/giá trị: "… đủ điều kiện là 0 đồng", "… bằng 0 đồng do …" (có "là/bằng" trần, nên không dùng cho mọi mệnh đề). */
const ZERO_TAIL_NARROW = `(?:(?:hiện (?:tại|tính được|ghi nhận)\\s+)?(?:là|bằng)|hiện (?:tại|tính được|ghi nhận)|tối đa):?\\s*0\\s*(?:đồng|VND|₫)${ZERO_WHY}\\.?\\s*$`;
const ZERO_STATUS = new RegExp(`\\s*[A-ZÀ-Ỵa-zà-ỵ][^.;:]*${ZERO_TAIL}`, 'u');
/** Như trên nhưng chỉ khi mệnh đề nói về giá trị bảo đảm/hạn mức (dùng cho dòng ngắn như tiêu đề; "dư nợ hiện tại 0 đồng" là thông tin thật nên giữ). */
const ZERO_COLLATERAL = new RegExp(`\\s*[A-ZÀ-Ỵa-zà-ỵ](?=[^.;:]*(?:bảo đảm|hạn mức|giá trị|TSĐB))[^.;:]*(?:${ZERO_TAIL}|${ZERO_TAIL_NARROW})`, 'u');
export function dropZeroStatus(t: string, narrow = false): string {
  const re = narrow ? ZERO_COLLATERAL : ZERO_STATUS;
  return re.test(t) ? t.replace(re, '').replace(/[\s;,:]+$/, '').trim() : t;
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
  for (let i = 0; i < 3; i += 1) t = t.replace(/(^|[\s(])(\p{L}{2,})\s+\2(?=[\s.,;:)]|$)/giu, (m, a: string, w: string) => (REDUP.has(w.toLowerCase()) ? m : a + w));
  return trimDangling(lowerAfterComma(dropZeroStatus(t.replace(/\s{2,}/g, ' ').trim(), true)));
}
/** Trích nguồn hiển thị. */
export const quoteText = (q: string): string => cleanAiLine(q);
const PUNCT = /[\s.…,:;"“”–—-]+/;
const foldPlain = (x: string) => String(x ?? '').toLowerCase().replace(new RegExp(PUNCT.source, 'g'), ' ').trim();
/** Trích nguồn đứng sau nhãn nguồn: đoạn trích bắt đầu bằng chính nhãn thì bỏ phần lặp; chỉ còn dấu lửng thì trả chuỗi rỗng. */
export function quoteAfterLabel(rawLabel: string, quote: string): string {
  const q = quoteText(quote) ?? '';
  if (!rawLabel) return q; // nguồn không có nhãn (dữ liệu cũ chỉ là một dòng chữ): giữ nguyên đoạn trích
  const label = cleanAiLine(rawLabel); // nhãn và trích đi cùng một bộ làm sạch: " – " và ", " là một
  const l = foldPlain(label);
  let out = q;
  if (l.length >= 4 && foldPlain(q).startsWith(l)) {
    let i = 0; let j = 0; const lc = l;
    // cắt đúng phần đầu của q tương ứng với nhãn (so khớp từng ký tự, bỏ qua dấu câu và khoảng trắng)
    const qq = q.toLowerCase();
    while (i < qq.length && j < lc.length) {
      if (PUNCT.test(qq[i])) { i += 1; if (lc[j] === ' ') j += 1; continue; }
      if (qq[i] === lc[j]) { i += 1; j += 1; } else { break; }
    }
    out = q.slice(i).replace(/^[\s.…,:;"“”—–-]+/, '').trim();
  }
  return /^[\s.…]*$/.test(out) ? '' : out;
}
/** Phần trích sau nhãn nguồn bắt đầu bằng chữ thường nghĩa là nhãn chỉ là mấy chữ đầu của một cụm ("Kiểm chứng" + "độc lập bằng công cụ…"): nối liền, không đặt dấu hai chấm và ngoặc kép giữa cụm. */
export function sourceQuoteParts(label: string, quote: string): { rest: string; joined: boolean } {
  const rest = quoteAfterLabel(label, quote);
  return { rest, joined: /^\p{Ll}/u.test(rest) };
}
const upFirst = (x: string) => (x ? x.charAt(0).toLocaleUpperCase('vi') + x.slice(1) : x);
const NEED_INFO = /^Cần bổ sung\s+([^:;]{3,60}):\s*([\s\S]*)$/i;
const wordCount = (x: string) => x.split(/\s+/).filter(Boolean).length;

/** Văn bản do agent sinh: bỏ "— " đầu, đổi nhãn đầu câu thành chip, tách thành gạch đầu dòng chỉ khi các mảnh là ý độc lập. */
export function parseAiText(raw: string): AiTextParts {
  let t = scrubBase(raw ?? '').replace(/^[\s—–-]+/, '').trim();
  t = t.replace(/\s+vs\.?\s+/gi, ' so với ').replace(/\bhit\b/gi, 'kết quả trùng').replace(/^#+\s*/, '');
  t = trimDangling(t);
  // Câu "… hiện tính được/ghi nhận (là) 0 đồng" là số máy móc khi chưa đủ điều kiện, không nói thêm gì.
  t = dropZeroStatus(t);
  t = t.replace(/\.{3,}/g, '…');
  let tag: string | undefined;
  let lead: string | undefined;
  const m = t.match(CAPS_TAG);
  if (m) { tag = sentenceCase(m[1]); t = m[2]; }
  t = humanizeGate(t);
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

/** Hai đoạn chữ AI cho cùng một nội dung sau khi làm sạch (không tính hoa thường, dấu câu). */
export const sameAiText = (a: string, b: string): boolean => {
  const k = (x: string) => { const p = parseAiText(x ?? ''); return foldPlain([p.tag, p.lead, ...p.items].filter(Boolean).join(' ')); };
  const ka = k(a); return ka.length > 0 && ka === k(b);
};

/** Phần "Điều kiện chính: …" ở cuối diễn giải của Validation (không kèm câu mở đầu); null nếu không có. */
export function narrativeConditions(narrative: string | null | undefined): string | null {
  const m = String(narrative ?? '').match(/Điều kiện chính:\s*([\s\S]+)$/);
  // Các ý nối bằng ";" cùng một kiểu chữ: ý đầu viết hoa, ý sau chữ thường (trừ từ viết tắt: chữ hoa thứ hai trở đi giữ nguyên)
  return m && m[1].trim() ? m[1].trim().replace(/;\s+(\p{Lu})(?=\p{Ll})/gu, (_x, c: string) => `; ${c.toLowerCase()}`) : null;
}

/** Hai đoạn chữ AI nói cùng một nội dung: một đoạn nằm gọn trong đoạn kia (≥ 70% từ khóa, từ 6 từ trở lên), dù nhãn hay dấu câu khác. */
export const coversAiText = (a: string | null | undefined, b: string | null | undefined): boolean => {
  const w = (x: string) => new Set(fold(String(x ?? '')).split(/[^a-z0-9]+/).filter((t) => t.length > 2));
  const [wa, wb] = [w(a ?? ''), w(b ?? '')];
  const [small, big] = wa.size <= wb.size ? [wa, wb] : [wb, wa];
  if (small.size < 6) return foldPlain(a ?? '').length > 0 && foldPlain(a ?? '') === foldPlain(b ?? '');
  let hit = 0; small.forEach((t) => { if (big.has(t)) hit += 1; });
  return hit / small.size >= 0.7;
};

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

/** Danh sách tài liệu của một đề xuất hành động, đúng như backend sẽ gửi đi: chỉ làm sạch chữ từng mục (mã nội bộ),
 *  không ghép, không lọc, không gộp mục gần giống; chỉ bỏ mục trùng y hệt sau khi chuẩn hóa hoa/thường, dấu và khoảng trắng. */
export function exactDocumentList(list: unknown[] | null | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of Array.isArray(list) ? list : []) {
    const x = typeof raw === 'string' ? raw : (raw && typeof (raw as { text?: unknown }).text === 'string' ? (raw as { text: string }).text : '');
    const t = scrubInternal(x).trim().replace(/[\s.;:,]+$/, '');
    const k = fold(t).replace(/[^a-z0-9]+/g, ' ').trim();
    if (!t || seen.has(k)) continue;
    seen.add(k); out.push(upFirst(t));
  }
  return out;
}
/** Ý chỉ nêu số hiện trạng ("… hiện tại: 0 đồng"): không bảo ai làm gì nên không phải yêu cầu bổ sung. */
const STATUS_ONLY_BASE = /hiện (?:tại|tính được|ghi nhận)(?: (?:là|bằng))?:?\s*[\d.,]+\s*(?:đồng|VND|₫|%|tỷ(?: đồng)?)?\s*\.?$/iu;
/** Như trên nhưng số 0 đồng của bảo đảm/hạn mức, có hoặc không có "hiện tại", có hoặc không có lý do "do …": nhận xét, không phải việc cần làm. */
const STATUS_ZERO_COLLATERAL = /^(?=[^.;:]*(?:bảo đảm|hạn mức|giá trị|TSĐB))[^.;:]*?(?:\b(?:là|bằng)|hiện (?:tại|tính được|ghi nhận)|tối đa):?\s*0\s*(?:đồng|VND|₫)(?:\s+(?:do|vì|bởi vì)\s+[^.;:]*)?\s*\.?$/iu;
const STATUS_ONLY = { test: (x: string) => STATUS_ONLY_BASE.test(x) || STATUS_ZERO_COLLATERAL.test(x) };
/** Động từ quy trình chung và từ nối: một ý chỉ gồm các từ này (không nêu tài liệu hay đối tượng cụ thể) là mảnh câu, không phải việc cần làm. */
const GENERIC_WORDS = new Set(['hoan', 'thien', 'doi', 'chieu', 'kiem', 'tra', 'ra', 'soat', 'xem', 'xet', 'hoan', 'tat', 'xac', 'nhan', 'truoc', 'khi', 'quyet', 'dinh', 'trinh', 'phe', 'duyet', 'cac', 'day', 'du', 'va', 'de', 'cap', 'tiep', 'tuc', 'ho', 'so', 'thong', 'tin', 'viec']);
const isFragment = (x: string): boolean => {
  const w = fold(x).split(/[^a-z0-9]+/).filter(Boolean);
  return w.length > 0 && w.every((k) => GENERIC_WORDS.has(k));
};
/** Ý chỉ nêu tình trạng một chỉ số ("DSCR cần xác minh và chưa đối chiếu được LTV"): không bảo ai làm gì nên không phải yêu cầu. */
const METRIC_STATUS = /^(?:DSCR|LTV|DTI|ICR)\b(?!.*\b(?:làm rõ|bổ sung|cung cấp|giải trình|nộp)\b)\s+(?:cần xác minh|chưa|còn|đang|thấp|cao|vượt|dưới|trên|đạt)/iu;
/** Danh sách điều kiện/yêu cầu bổ sung cho người đọc: làm sạch từng ý, ghép mảnh bị tách tại ";" (mở bằng chữ thường) vào ý trước,
 *  bỏ ý chỉ nêu số hiện trạng, tình trạng chỉ số và mảnh câu chung chung, rồi gộp ý trùng. Chịu được undefined, chuỗi rỗng, phần tử không phải chuỗi. */
export function cleanConditionList(list: unknown[] | null | undefined): string[] {
  const merged: string[] = [];
  for (const raw of Array.isArray(list) ? list : []) {
    const x = typeof raw === 'string' ? raw : (raw && typeof (raw as { text?: unknown }).text === 'string' ? (raw as { text: string }).text : '');
    const t = scrubInternal(x).trim().replace(/[\s.;:,]+$/, '');
    if (!t) continue;
    if (/^\p{Ll}/u.test(t) && merged.length) merged[merged.length - 1] += `; ${t}`;
    else merged.push(upFirst(t));
  }
  return dedupeConditions(merged.filter((x) => !STATUS_ONLY.test(x.replace(/[\s.;]+$/, '')) && !isFragment(x) && !METRIC_STATUS.test(x)));
}
/** Tiêu đề thẻ "Yêu cầu khách bổ sung N mục": đếm lại N sau khi làm sạch danh sách. */
export const recountTitle = (title: string, n: number): string => cleanAiLine(title).replace(/\b\d+\s+mục\b/, `${n} mục`);

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

/** Nhãn loại đề xuất đã nằm đầu tiêu đề ("Điều kiện trước giải ngân: …") thì bỏ khỏi tiêu đề, để nhãn chỉ hiện một lần. */
export function stripKindLabel(label: string, title: string): string {
  const t = cleanAiLine(title ?? '');
  const l = foldPlain(label ?? '');
  if (!l || !foldPlain(t).startsWith(l)) return t;
  let i = 0; let j = 0; const tl = t.toLowerCase();
  while (i < tl.length && j < l.length) {
    if (PUNCT.test(tl[i])) { i += 1; if (l[j] === ' ') j += 1; continue; }
    if (tl[i] === l[j]) { i += 1; j += 1; } else break;
  }
  const rest = t.slice(i).replace(/^[\s.…,:;—–-]+/, '').trim();
  return rest || t;
}
const RATIONALE_SECTION: Record<string, string> = {
  add_disbursement_condition: 'mục Điều kiện của báo cáo cuối (Validation)',
  request_documents: 'mục Cần bổ sung của báo cáo cuối (Validation)',
  add_risk_flag: 'mục Rủi ro của báo cáo cuối (Validation)',
};
/** "nêu trong báo cáo cuối của đội agent" -> tên mục cụ thể theo loại đề xuất. */
export const rationaleText = (kind: string, raw: string): string =>
  cleanAiLine(raw ?? '').replace(/nêu trong báo cáo cuối của đội agent/i, `nêu ở ${RATIONALE_SECTION[kind] ?? 'báo cáo cuối của Validation'}`);
/** Số mục "N mục" trong tiêu đề yêu cầu bổ sung mà danh sách không có ở đây: chỉ dẫn nơi xem. */
export const withListHint = (title: string): string => (/\b\d+\s+mục\b/.test(title) ? `${title}, xem danh sách ở Việc cần làm` : title);
