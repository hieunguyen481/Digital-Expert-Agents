import apiClient from './apiClient';
import { getValidAccessToken } from '@/auth/keycloak';

export interface AgentVerdict {
  agent: string;
  decision: string;
  summary: string;
  evidence?: { source: string; quote: string }[];
}

export interface AgentCase {
  case_id: string;
  customer_id: string;
  state: string;
  approver: string | null;
  package: {
    verdicts?: AgentVerdict[];
    conditions?: string[];
    plan_version?: number;
    policy_version?: string;
    proposed_limit?: number;
    recommendation?: string;
    required_approver_level?: string;
  } | null;
  plan: { tasks: { task_id: string; agent: string; objective: string; depends_on: string[] }[] } | null;
}

export interface AgentCaseEvent {
  id: number;
  agent: string;
  type: string;
  ts: number;
  payload?: Record<string, unknown>;
}

export interface AgentCaseSummary {
  case_id: string;
  customer_id: string;
  submitted_by: string;
  approver: string | null;
  state: string;
  created_at: number;
  updated_at: number;
  replan_count: number;
  request: { amount?: number | null; purpose?: string | null; term_months?: number | null };
  tool_calls: number;
  llm_calls: number;
  cost_usd: number | null;
}

export interface AgentCaseStats {
  cases: number;
  avg_seconds: number | null;
  by_state: Record<string, number>;
  tool_calls: number;
  llm_calls: number;
  cost_usd: number | null;
  challenges: number;
  tools: { tool: string; n: number; failed: number }[];
  agents: { agent: string; tasks: number; errors: number; tool_calls: number }[];
}

export interface ConfirmInput {
  loan_application_id: string;
  decision_type: 'APPROVED' | 'REJECTED' | 'CONDITIONAL';
  reason: string;
  approver_level?: string;
  approved_amount?: number;
  approved_term_months?: number;
  conditions?: string[];
}

export const TERMINAL_STATES = ['Pending Approval', 'Needs Info', 'Escalated', 'Executing', 'Completed', 'Rejected'];

export async function listAgentCases(limit = 100): Promise<AgentCaseSummary[]> {
  return (await apiClient.get<AgentCaseSummary[]>('/agent-cases', { params: { limit } })).data;
}

export async function getAgentCaseStats(): Promise<AgentCaseStats> {
  return (await apiClient.get<AgentCaseStats>('/agent-cases/stats')).data;
}

export async function getAgentCase(caseId: string): Promise<AgentCase> {
  return (await apiClient.get<AgentCase>(`/agent-cases/${caseId}`)).data;
}

export async function getAgentCaseEvents(caseId: string): Promise<AgentCaseEvent[]> {
  const data = (await apiClient.get<AgentCaseEvent[] | { events: AgentCaseEvent[] }>(`/agent-cases/${caseId}/events`)).data;
  return Array.isArray(data) ? data : data.events;
}

export async function getApproverNames(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  return (await apiClient.get<Record<string, string>>('/agent-cases/approver-names', { params: { ids: ids.join(',') } })).data;
}

export async function confirmAgentCase(caseId: string, input: ConfirmInput): Promise<unknown> {
  return (await apiClient.post(`/agent-cases/${caseId}/approve`, input)).data;
}

/**
 * SSE qua fetch streaming: token nằm ở header Authorization, không bao giờ ở URL.
 * Gọi `onEvent` cho mỗi sự kiện `data:`; kết thúc khi server đóng luồng hoặc `signal` huỷ.
 */
export async function streamAgentCase(
  caseId: string,
  onEvent: (event: AgentCaseEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const token = await getValidAccessToken();
  const base = apiClient.defaults.baseURL ?? '';
  const res = await fetch(`${base}/agent-cases/${caseId}/stream`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`Không mở được luồng sự kiện (HTTP ${res.status})`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const line = chunk.split('\n').find((l) => l.startsWith('data:'));
      if (!line) continue;
      try {
        onEvent(JSON.parse(line.slice(5).trim()) as AgentCaseEvent);
      } catch {
        /* bỏ qua dòng keep-alive không phải JSON */
      }
    }
  }
}
