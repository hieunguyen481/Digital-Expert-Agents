/** Khớp backend/app/schemas/loan_detail.py và memo.py. */
export interface MetricSource {
  field_id: string;
  document_id: string;
  document_title: string | null;
  page_number: number | null;
  source_type: string | null;
  verification_status: string | null;
  value_text: string | null;
  value_number: number | null;
  note: string | null;
  verified_by_name: string | null;
  verified_at: string | null;
}
export interface MetricValue extends MetricSource {
  kind: 'DECLARED' | 'RECOMPUTED';
  result: 'PASS' | 'FAIL' | null;
}
export interface Metric {
  code: string;
  label: string;
  unit: string;
  clause: string | null;
  threshold: { op: '>=' | '<='; value: number } | null;
  conflict_id: string | null;
  chosen: { field_id: string; reason: string | null; resolved_by_name: string | null; resolved_at: string | null } | null;
  values: MetricValue[];
}
export interface Flag {
  id: string; code: string; severity: string; title: string; status: string; source: string;
  blocks_submission: boolean; handling_note: string | null; early_warned_at: string | null; early_warning_note: string | null;
  compliance_conclusion: string | null; compliance_reason: string | null;
}
export interface Collateral {
  id: string; collateral_type: string; description: string | null; owner_name: string;
  declared_value: string | null; appraised_value: string | null; eligible_value: string | null; currency: string;
  valuation_date: string | null; valuation_status: string; ownership_verification_status: string;
}
export interface TimelineStep {
  id: string; step_code: string; assignee_name: string | null; received_at: string; due_at: string | null;
  completed_at: string | null; result: string | null; reason: string | null; reason_restricted: boolean;
}
export interface LoanOverview {
  loan: {
    id: string; application_number: string; status: string; requested_amount: string; currency: string;
    requested_term_months: number | null; approved_amount?: string | number | null; approved_term_months?: number | null; decision_type?: string | null; approval_tier: string | null; customer_name: string | null; assignee_name: string | null;
  };
  metrics: Metric[];
  flags: Flag[];
  collaterals: Collateral[];
  timeline: TimelineStep[];
  supplement_request?: { reason: string | null; requested_at: string; due_at: string | null } | null;
}

export interface AiBlock {
  id: string; text: string; state: 'PENDING' | 'CONFIRMED' | 'REJECTED'; source: string; source_ref: string | null;
}
export interface MemoSection { body: string; ai_blocks: AiBlock[] }
export type MemoSections = Record<string, MemoSection>;
export interface MemoDraft {
  revision: number; version: number; sections: MemoSections; updated_at: string | null; updated_by_name: string | null;
}
export interface MemoFinalized {
  revision: number; finalized_at: string; finalized_by_name: string; sections: MemoSections;
}
export interface MemoView {
  loan_application_id: string;
  loan_status: string;
  titles: Record<string, string>;
  draft: MemoDraft | null;
  editable: boolean;
  progress: Record<string, boolean> | null;
  finalized: MemoFinalized | null;
  versions: { revision: number; finalized_at: string; finalized_by_name: string }[];
}

/** Khớp backend/app/schemas/case_action.py. */
export interface CaseActionState {
  version: number;
  status: string;
  memo_revision: number | null;
  opinions: { kind: 'RISK' | 'COMPLIANCE'; content: string; author_name: string; created_at: string }[];
  pending_exceptions: { id: string; checklist_code: string; kind: string; reason: string; proposed_by_name?: string }[];
  tier: { submitted: number | null; required: number | null; upgrade_due: boolean };
  excluded: boolean;
  blockers: string[];
}
