import apiClient from '@/services/apiClient';
import type { CaseActionState, LoanOverview, MemoView } from './types';

const base = (loanId: string) => `/loan-applications/${loanId}`;

export async function fetchOverview(loanId: string): Promise<LoanOverview> {
  return (await apiClient.get<LoanOverview>(`${base(loanId)}/overview`)).data;
}
export async function fetchMemo(loanId: string): Promise<MemoView> {
  return (await apiClient.get<MemoView>(`${base(loanId)}/memo`)).data;
}
export async function downloadMemoPdf(loanId: string): Promise<void> {
  const res = await apiClient.get<Blob>(`${base(loanId)}/memo/pdf`, { responseType: 'blob' });
  const name = /filename="([^"]+)"/.exec(String(res.headers['content-disposition'] ?? ''))?.[1] ?? 'to-trinh.pdf';
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
export async function saveMemo(loanId: string, version: number, bodies: Record<string, string>) {
  return (await apiClient.put<MemoView>(`${base(loanId)}/memo`, { version, bodies })).data;
}
export async function decideAiBlock(loanId: string, blockId: string, version: number, decision: 'CONFIRM' | 'REJECT') {
  return (await apiClient.post<MemoView>(`${base(loanId)}/memo/ai-blocks/${blockId}/decision`, { version, decision })).data;
}

export async function fetchActionState(loanId: string): Promise<CaseActionState> {
  return (await apiClient.get<CaseActionState>(`${base(loanId)}/actions`)).data;
}
/** Chuyển bước đi qua POST /transitions (cổng, E8, lý do bắt buộc kiểm ở backend). */
export async function runTransition(loanId: string, action: string, version: number, reason?: string, params?: Record<string, unknown>) {
  return (await apiClient.post(`${base(loanId)}/transitions`, { action, expected_version: version, reason: reason || null, params: params ?? null })).data;
}
/** Q11: QHKH gia hạn hạn bổ sung đúng 1 lần, có lý do (+5 ngày làm việc). */
export async function extendDeadline(loanId: string, reason: string) {
  return (await apiClient.post<{ due_at: string }>(`${base(loanId)}/extend-deadline`, { reason })).data;
}
export async function handleFlag(loanId: string, flagId: string, note: string) {
  await apiClient.post(`${base(loanId)}/flags/${flagId}/handle`, { note });
}
export async function earlyWarning(loanId: string, flagId: string, note: string) {
  await apiClient.post(`${base(loanId)}/flags/${flagId}/early-warning`, { note });
}
export async function concludeFlag(loanId: string, flagId: string, conclusion: string, reason: string) {
  return (await apiClient.post<{ status: string }>(`${base(loanId)}/flags/${flagId}/conclusion`, { conclusion, reason })).data;
}
export async function addOpinion(loanId: string, kind: 'RISK' | 'COMPLIANCE', content: string) {
  await apiClient.post(`${base(loanId)}/risk-opinions`, { kind, content });
}
export async function upgradeApproval(loanId: string, reason: string) {
  return (await apiClient.post<{ tier: number }>(`${base(loanId)}/approval-upgrade`, { reason })).data;
}

export interface AgentRunItem { id: string; case_id: string; created_at: string; started_by: string; started_by_name: string | null }
export interface AgentRunOverview { can_run: boolean; deny_reason: string | null; latest: AgentRunItem | null; runs: AgentRunItem[] }
export async function fetchAgentRuns(loanId: string): Promise<AgentRunOverview> {
  return (await apiClient.get<AgentRunOverview>(`${base(loanId)}/agent-runs`)).data;
}
/** Tạo lượt chạy mới (giữ lượt cũ). 403 kèm lý do nếu không phải người đang giữ hồ sơ; 409 nếu đang có lượt chạy. */
export async function startAgentRun(loanId: string): Promise<AgentRunOverview> {
  return (await apiClient.post<AgentRunOverview>(`${base(loanId)}/agent-runs`)).data;
}
