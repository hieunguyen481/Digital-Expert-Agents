import apiClient from '@/services/apiClient';
import type { ReconDocumentDetail, ReconLog, ReconView } from './types';

const base = (loanId: string) => `/loan-applications/${loanId}/reconciliation`;

export async function fetchReconciliation(loanId: string): Promise<ReconView> {
  return (await apiClient.get<ReconView>(base(loanId))).data;
}

export async function fetchReconDocument(loanId: string, documentId: string): Promise<ReconDocumentDetail> {
  return (await apiClient.get<ReconDocumentDetail>(`${base(loanId)}/documents/${documentId}`)).data;
}

export async function fetchReconLog(loanId: string): Promise<ReconLog> {
  return (await apiClient.get<ReconLog>(`${base(loanId)}/log`)).data;
}

export async function checkItem(loanId: string, itemId: string, result: 'PASS' | 'FAIL', note: string | null) {
  await apiClient.post(`${base(loanId)}/items/${itemId}/check`, { result, note });
}

export async function resolveConflict(loanId: string, conflictId: string, chosenFieldId: string, reason: string) {
  await apiClient.post(`${base(loanId)}/conflicts/${conflictId}/resolution`, {
    chosen_field_id: chosenFieldId,
    reason,
  });
}

export async function transferToAppraisal(loanId: string, expectedVersion: number) {
  return (
    await apiClient.post<{ status: string }>(`${base(loanId)}/transfer`, { expected_version: expectedVersion })
  ).data;
}

/** Xác nhận một trường qua endpoint sẵn có; người xác nhận chịu trách nhiệm, AI không tự xác nhận. */
export async function confirmField(fieldId: string, reason: string) {
  await apiClient.patch(`/document-fields/${fieldId}/verification`, {
    verification_status: 'CONFIRMED',
    verification_reason: reason,
  });
}

/** Ảnh trang đã dựng sẵn bởi worker (URL ký sẵn, hết hạn). */
export async function fetchPageImageUrl(versionId: string, page: number): Promise<string> {
  return (await apiClient.get<{ url: string }>(`/document-versions/${versionId}/pages/${page}/preview-url`)).data.url;
}
