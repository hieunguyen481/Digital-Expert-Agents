import apiClient from '@/services/apiClient';
import type { CustomerOption, Draft, DraftSaveBody, LoanProduct } from './types';

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
