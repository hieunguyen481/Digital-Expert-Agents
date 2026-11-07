import apiClient from '@/services/apiClient';
import type { CicStatus, CustomerOption, Draft, DraftSaveBody, LoanProduct, ProposalDocument } from './types';

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
}

export async function searchCustomers(search: string): Promise<CustomerOption[]> {
  const res = await apiClient.get<{ items: BackendCustomerRow[] }>('/customers', {
    params: { page: 1, page_size: 20, search: search || undefined },
  });
  return res.data.items.flatMap((r) => {
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
