import apiClient from '@/services/apiClient';
import type { LoanOverview, MemoView } from './types';

const base = (loanId: string) => `/loan-applications/${loanId}`;

export async function fetchOverview(loanId: string): Promise<LoanOverview> {
  return (await apiClient.get<LoanOverview>(`${base(loanId)}/overview`)).data;
}
export async function fetchMemo(loanId: string): Promise<MemoView> {
  return (await apiClient.get<MemoView>(`${base(loanId)}/memo`)).data;
}
export async function saveMemo(loanId: string, version: number, bodies: Record<string, string>) {
  return (await apiClient.put<MemoView>(`${base(loanId)}/memo`, { version, bodies })).data;
}
export async function decideAiBlock(loanId: string, blockId: string, version: number, decision: 'CONFIRM' | 'REJECT') {
  return (await apiClient.post<MemoView>(`${base(loanId)}/memo/ai-blocks/${blockId}/decision`, { version, decision })).data;
}
