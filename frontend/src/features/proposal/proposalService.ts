import apiClient from '@/services/apiClient';
import type {
  CicStatus,
  CollateralItem,
  CustomerOption,
  Draft,
  DraftSaveBody,
  ExceptionItem,
  LoanProduct,
  ProposalDocument,
  RelatedParties,
  SubmitConditions,
} from './types';

export async function fetchDraft(loanId: string): Promise<Draft> {
  return (await apiClient.get<Draft>(`/loan-applications/${loanId}/draft`)).data;
}

export async function saveDraft(loanId: string, body: DraftSaveBody): Promise<Draft> {
  return (await apiClient.put<Draft>(`/loan-applications/${loanId}/draft`, body)).data;
}

export async function fetchProducts(): Promise<LoanProduct[]> {
  return (await apiClient.get<LoanProduct[]>('/loan-products')).data;
}

interface BackendCustomerRow {
  id?: string | null;
  customer_id?: string | null;
  display_name?: string | null;
  full_name?: string | null;
  customer_number: string;
  relationship_manager_id?: string | null;
}

export async function searchCustomers(search: string): Promise<CustomerOption[]> {
  const [res, me] = await Promise.all([
    apiClient.get<{ items: BackendCustomerRow[] }>('/customers', {
      params: { page: 1, page_size: 50, search: search || undefined },
    }),
    apiClient.get<{ employee_id: string }>('/me'),
  ]);
  // Khách của bộ ca đo benchmark không phải khách thật để tạo đề xuất.
  // Chỉ gợi ý khách chưa ai phụ trách hoặc do chính mình phụ trách: khách của người khác sẽ bị từ chối khi tạo.
  const mine = me.data.employee_id;
  return res.data.items.filter((r) => !/benchmark/i.test(r.display_name ?? r.full_name ?? '')
    && (!r.relationship_manager_id || r.relationship_manager_id === mine)).flatMap((r) => {
    const id = r.id ?? r.customer_id;
    return id ? [{ id, display_name: r.display_name ?? r.full_name ?? r.customer_number, customer_number: r.customer_number }] : [];
  });
}

export async function createLoan(input: {
  customerId: string;
  product: LoanProduct;
  amountVnd: string;
  termMonths: number;
}): Promise<{ id: string }> {
  const res = await apiClient.post<{ id: string }>(
    '/loan-applications',
    {
      primary_customer_id: input.customerId,
      product_id: input.product.id,
      requested_amount: input.amountVnd,
      currency: 'VND',
      requested_term_months: input.termMonths,
      loan_purpose: input.product.loan_purpose ?? 'WORKING_CAPITAL',
    },
    { headers: { 'Idempotency-Key': crypto.randomUUID() } },
  );
  return res.data;
}

export async function fetchProposalDocuments(loanId: string): Promise<ProposalDocument[]> {
  return (await apiClient.get<ProposalDocument[]>(`/loan-applications/${loanId}/proposal-documents`)).data;
}

export async function fetchCic(loanId: string): Promise<CicStatus> {
  return (await apiClient.get<CicStatus>(`/loan-applications/${loanId}/cic`)).data;
}

export async function lookupCic(loanId: string): Promise<CicStatus> {
  return (await apiClient.post<CicStatus>(`/loan-applications/${loanId}/cic-lookups`)).data;
}

export async function confirmConsent(
  loanId: string,
  body: { document_id: string; signed_on: string; valid_until: string | null },
): Promise<CicStatus> {
  return (await apiClient.post<CicStatus>(`/loan-applications/${loanId}/cic-consent`, body)).data;
}

const base = (loanId: string) => `/loan-applications/${loanId}`;

export async function fetchRelatedParties(loanId: string): Promise<RelatedParties> {
  return (await apiClient.get<RelatedParties>(`${base(loanId)}/related-parties`)).data;
}

export async function decideRelatedParty(
  loanId: string,
  partyId: string,
  body: { status: 'CONFIRMED' | 'NOT_IN_GROUP'; basis: string | null },
): Promise<RelatedParties> {
  return (await apiClient.put<RelatedParties>(`${base(loanId)}/related-parties/${partyId}`, body)).data;
}

export async function chooseLeasePayment(loanId: string, collateralId: string, payment: 'ANNUAL' | 'ONE_TIME') {
  return (
    await apiClient.put<CollateralItem[]>(`${base(loanId)}/collaterals/${collateralId}/lease-payment`, {
      land_lease_payment: payment,
    })
  ).data;
}

export async function fetchSubmitConditions(loanId: string): Promise<SubmitConditions> {
  return (await apiClient.get<SubmitConditions>(`${base(loanId)}/submit-conditions`)).data;
}

export async function proposeException(loanId: string, checklistCode: string, reason: string): Promise<ExceptionItem> {
  return (await apiClient.post<ExceptionItem>(`${base(loanId)}/exceptions`, { checklist_code: checklistCode, reason })).data;
}

export async function withdrawException(loanId: string, exceptionId: string): Promise<void> {
  await apiClient.post(`${base(loanId)}/exceptions/${exceptionId}/withdraw`);
}

export async function submitProposal(
  loanId: string,
  expectedVersion: number,
): Promise<{ status: string; step_code: string | null; carried_flags: string[] }> {
  return (await apiClient.post(`${base(loanId)}/submissions`, { expected_version: expectedVersion })).data;
}
