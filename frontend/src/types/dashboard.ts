import type { AgentRole, AgentTrace } from './agent';

/**
 * Types cho Dashboard giám sát hệ chuyên gia số.
 * Đáp ứng deliverable: "A dashboard showing agent traces, task status,
 * decisions, and collaboration flows".
 */

export type TaskStatus = 'running' | 'completed' | 'failed' | 'escalated';

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  running: 'Đang xử lý',
  completed: 'Hoàn thành',
  failed: 'Lỗi',
  escalated: 'Trình cấp trên',
};

export type TaskDecision = 'approved' | 'rejected' | 'need-info' | 'escalated' | 'none';

export const TASK_DECISION_LABEL: Record<TaskDecision, string> = {
  approved: 'Đề xuất duyệt',
  rejected: 'Đề xuất từ chối',
  'need-info': 'Cần bổ sung',
  escalated: 'Vượt hạn mức',
  none: 'Không có quyết định',
};

/** Một lượt chạy của hệ agent cho một yêu cầu. */
export interface AgentRun {
  id: string;
  /** Yêu cầu gốc của chuyên viên. */
  request: string;
  /** Hồ sơ liên quan, nếu có. */
  reference?: string;
  status: TaskStatus;
  decision: TaskDecision;
  /** Các agent đã tham gia. */
  agents: AgentRole[];
  startedAt: string;
  durationMs: number;
  /** Số công cụ đã gọi. */
  toolCalls: number;
  trace: AgentTrace;
}

/** Chỉ số hiệu năng theo từng agent. */
export interface AgentMetric {
  agent: AgentRole;
  tasks: number;
  /** Tỉ lệ hoàn thành thành công, %. */
  successRate: number;
  /** Thời gian xử lý trung bình, ms. */
  avgDurationMs: number;
  toolCalls: number;
}

/** Một cạnh trong luồng cộng tác giữa các agent. */
export interface CollaborationEdge {
  from: AgentRole;
  to: AgentRole;
  /** Số lần bàn giao công việc. */
  count: number;
}

/** Một chỉ tiêu trong bảng so sánh single-agent vs multi-agent. */
export interface ComparisonMetric {
  id: string;
  label: string;
  description: string;
  singleAgent: string;
  multiAgent: string;
  /** Hệ nào tốt hơn ở chỉ tiêu này. */
  winner: 'single' | 'multi' | 'tie';
}

/** Trung bình ± độ lệch chuẩn của một chỉ số qua các lượt đo (null nếu không có lượt hợp lệ). */
export interface BenchmarkStat {
  mean: number | null;
  sd: number | null;
}

export type BenchmarkMode = 'single' | 'multi';

export interface BenchmarkModeSummary {
  runs: number;
  errors: number;
  finding_recall: BenchmarkStat;
  citation_recall: BenchmarkStat;
  tool_recall: BenchmarkStat;
  false_findings: BenchmarkStat;
  invalid_citations: BenchmarkStat;
  gate_ok: BenchmarkStat;
  tool_calls: BenchmarkStat;
  latency_s: BenchmarkStat;
  total_tokens: BenchmarkStat;
  cost_usd: BenchmarkStat;
}

/** Kết quả một lần chạy benchmark đã lưu (agent.benchmark_run) do gateway trả, dưới RLS. */
export interface BenchmarkRun {
  run_id: string;
  created_at: string;
  label: string;
  cases_version: string;
  /** Phiên bản bộ chấm (v1 gốc; v2 hiểu câu phủ định). */
  grader_version: string;
  /** run_id gốc nếu đây là chấm lại dữ liệu cũ bằng bộ chấm mới (không đo mới). */
  regrade_of: string | null;
  llm_mode: string;
  planner_model: string;
  specialist_model: string;
  git_commit: string;
  runs_per_case: number;
  total_cost_usd: number | null;
  summary: Partial<Record<BenchmarkMode, BenchmarkModeSummary>>;
  per_case: Record<string, Partial<Record<BenchmarkMode, BenchmarkModeSummary>>>;
}

/** Một dòng trong danh sách lượt đo để chọn. */
export interface BenchmarkRunMeta {
  run_id: string;
  created_at: string;
  label: string;
  cases_version: string;
  grader_version: string;
  regrade_of: string | null;
  llm_mode: string;
  runs_per_case: number;
  total_cost_usd: number | null;
  /** Chế độ có số đo trong lượt (single, multi); lượt hai chế độ mới so sánh được. */
  modes?: ('single' | 'multi')[];
}

export interface BenchmarkLatest {
  status: 'ok' | 'empty';
  run: BenchmarkRun | null;
}
