/** Khớp `WorkItemsResponse` của GET /api/v1/work-items (backend/app/schemas/work_item.py). */
export type SlaLevel = 'over' | 'today' | 'soon' | 'ok' | 'pause' | 'none';
export type WorkTag = 'new' | 'ret' | 'bosung' | 'over';
export type QueueFilter = 'all' | 'over' | 'ret' | 'bosung' | 'new';

export interface WorkItem {
  loan_application_id: string;
  application_number: string;
  customer_name: string;
  requested_amount: string;
  status: string;
  step_code: string;
  step_received_at: string;
  due_at: string | null;
  paused: boolean;
  remaining_workdays: number | null;
  sla_level: SlaLevel;
  mine: boolean;
  tags: WorkTag[];
  open_flags: number;
  high_flags: number;
  fields_to_confirm: number;
  /** Người đang giữ bước chính (danh sách của Trưởng phòng). */
  holder_name?: string | null;
}

export interface WorkItemFacts {
  overdue: number;
  due_within_1_workday: number;
  returned: number;
  waiting_supplement: number;
}

export interface WorkItemsResponse {
  badge: number;
  facts: WorkItemFacts;
  items: WorkItem[];
}

export const QUEUE_FILTERS: ReadonlyArray<{ key: QueueFilter; label: string }> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'over', label: 'Quá hạn' },
  { key: 'ret', label: 'Bị trả lại' },
  { key: 'bosung', label: 'Chờ bổ sung' },
  { key: 'new', label: 'Mới' },
];
