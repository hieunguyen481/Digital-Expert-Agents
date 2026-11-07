/** Khớp backend/app/schemas/reconciliation.py. */
export interface ReconDocument {
  document_id: string;
  version_id: string | null;
  title: string | null;
  document_type: string;
  document_subtype: string | null;
  verification_status: string;
  issued_date: string | null;
  counts_for_checklist: boolean;
  page_count: number;
  field_count: number;
  needs_verification_count: number;
  ai_proposed_count: number;
}

export interface ReconCheck {
  result: 'PASS' | 'FAIL';
  note: string | null;
  actor_name: string | null;
  at: string;
}

export interface ReconItem {
  item_id: string;
  code: string;
  document_type: string | null;
  mandatory: boolean;
  status: string;
  has_exception: boolean;
  document_ids: string[];
  check: ReconCheck | null;
}

export interface ReconSource {
  field_id: string;
  document_id: string;
  document_title: string | null;
  field_name: string;
  value: string | null;
  value_number: number | null;
  page_number: number | null;
  source_type: string;
  verification_status: string;
}

export interface ReconConflict {
  conflict_id: string;
  code: string;
  sources: ReconSource[];
  chosen_field_id: string | null;
  resolution_reason: string | null;
  resolved_by_name: string | null;
  resolved_at: string | null;
}

export interface ReconTransfer {
  visible: boolean;
  locked: boolean;
  reasons: string[];
  carried_flags: string[];
  expected_version: number;
}

export interface ReconPermissions {
  can_check: boolean;
  can_resolve: boolean;
  can_confirm_fields: boolean;
}

export interface ReconView {
  loan_application_id: string;
  application_number: string;
  customer_name: string | null;
  status: string;
  items: ReconItem[];
  documents: ReconDocument[];
  extra_document_ids: string[];
  conflicts: ReconConflict[];
  transfer: ReconTransfer;
  permissions: ReconPermissions;
  data_label: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ReconField {
  field_id: string;
  field_name: string;
  value_type: string;
  value: string | null;
  value_number: number | null;
  page_number: number | null;
  bounding_box: BoundingBox | null;
  source_text: string | null;
  confidence: number | null;
  verification_status: string;
  source_type: string;
  verification_reason: string | null;
  verified_by_name: string | null;
  verified_at: string | null;
  conflict_id: string | null;
}

export interface ReconDocumentDetail {
  document: ReconDocument;
  fields: ReconField[];
  has_page_image: boolean;
}

export interface ConflictLogEntry {
  log_id: string;
  conflict_id: string;
  conflict_code: string;
  actor_name: string | null;
  old_value_text: string | null;
  new_value_text: string | null;
  reason: string;
  at: string;
}

export interface CheckLogEntry {
  log_id: string;
  requirement_code: string;
  actor_name: string | null;
  result: string;
  old_status: string;
  new_status: string;
  note: string | null;
  at: string;
}

export interface ReconLog {
  conflicts: ConflictLogEntry[];
  checks: CheckLogEntry[];
}
