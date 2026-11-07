export interface LoanProduct {
  id: string;
  product_code: string;
  product_name: string;
  loan_purpose: string | null;
  min_amount: string | null;
  max_amount: string | null;
  min_term_months: number | null;
  max_term_months: number | null;
}

export interface Draft {
  loan_application_id: string;
  application_number: string;
  status: string;
  version: number;
  editable: boolean;
  primary_customer_id: string;
  customer_name: string | null;
  product_id: string;
  product_code: string;
  product_name: string;
  min_amount: string | null;
  max_amount: string | null;
  min_term_months: number | null;
  max_term_months: number | null;
  requested_amount: string;
  requested_term_months: number;
  purpose_text: string | null;
  repayment_source_text: string | null;
  secured: boolean;
  saved_at: string | null;
  saved_by_name: string | null;
}

/** Nội dung form (đơn vị tiền: tỷ đồng, theo đặc tả giao diện). */
export interface DraftForm {
  productId: string;
  amountBillion: string;
  termMonths: string;
  purposeText: string;
  repaymentText: string;
  secured: boolean;
}

export interface DraftSaveBody {
  product_id: string;
  requested_amount: string;
  requested_term_months: number;
  purpose_text: string | null;
  repayment_source_text: string | null;
  secured: boolean;
  version: number;
}

export interface CustomerOption {
  id: string;
  display_name: string;
  customer_number: string;
}

export interface ProposalDocument {
  item_id: string;
  code: string;
  document_type: string | null;
  mandatory: boolean;
  state: 'OK' | 'AI' | 'MISSING' | 'EXPIRED';
  document_id: string | null;
  title: string | null;
  verification_status: string | null;
  issued_date: string | null;
  valid_until: string | null;
  has_exception: boolean;
  note: string | null;
}

export interface CicStatus {
  editable: boolean;
  consent: {
    code: 'OK' | 'MISSING' | 'UNCONFIRMED' | 'EXPIRED';
    usable: boolean;
    lock_reason: string | null;
    signed_on: string | null;
    valid_until: string | null;
    confirmed_by_name: string | null;
  };
  report: {
    looked_up_on: string;
    valid_until: string;
    looked_up_by_name: string | null;
    source: string;
    source_label: string | null;
    summary: Record<string, unknown>;
  } | null;
  report_status: 'NONE' | 'VALID' | 'EXPIRED';
  relookup_flag: boolean;
  relookup_flag_text: string | null;
  lookup_locked: boolean;
  lock_reason: string | null;
  today: string;
}
