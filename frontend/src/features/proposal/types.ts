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

export interface ExposureLine {
  party_id: string;
  name: string;
  relation: 'PRIMARY' | 'RELATED';
  status: 'PROPOSED' | 'CONFIRMED' | 'NOT_IN_GROUP' | null;
  basis: string | null;
  proposed_by_ai: boolean;
  outstanding: string;
  off_balance: string;
}

export interface RelatedParties {
  editable: boolean;
  lines: ExposureLine[];
  total_exposure: string;
  required_tier: number;
}

export interface CollateralItem {
  id: string;
  collateral_type: string;
  description: string | null;
  owner_name: string;
  on_leased_land: boolean;
  land_lease_payment: 'ANNUAL' | 'ONE_TIME' | null;
  has_lease_proof: boolean;
}

export interface ExceptionItem {
  id: string;
  checklist_code: string | null;
  kind: string;
  reason: string;
  proposed_at: string;
  decision: string | null;
  withdrawn_at: string | null;
}

export interface SubmitCondition {
  code: string;
  label: string;
  kind: 'BLOCKER' | 'CARRIED';
  met: boolean;
  detail: string | null;
  section: 'docs' | 'need' | 'related' | 'collateral' | 'summary';
}

export interface SubmitConditions {
  editable: boolean;
  can_submit: boolean;
  lock_reason: string | null;
  required_tier: number;
  conditions: SubmitCondition[];
  exceptions: ExceptionItem[];
  collaterals: CollateralItem[];
}
