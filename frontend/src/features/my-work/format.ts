import type { WorkItem } from './types';

/** "80 tỷ", "12,5 tỷ"; dưới 1 tỷ thì ghi triệu. */
export function formatBillion(amount: string): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '—';
  const fmt = (n: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(n);
  if (value >= 1e9) return `${fmt(value / 1e9)} tỷ`;
  return `${fmt(value / 1e6)} triệu`;
}

/** Số ngày làm việc (T2–T6) từ ngày `from` đến ngày `to`; âm khi `to` đã qua. */
export function workdaysBetween(from: Date, to: Date): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  const sign = end >= start ? 1 : -1;
  const [a, b] = sign === 1 ? [start, end] : [end, start];
  let count = 0;
  for (const d = new Date(a); d < b; d.setDate(d.getDate() + 1)) {
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const day = next.getDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return sign * count;
}

/** Câu SLA theo design-system §15. */
export function slaText(item: WorkItem, today: Date): string {
  if (item.paused || item.sla_level === 'pause') return 'tạm dừng';
  if (!item.due_at) return '—';
  const n = workdaysBetween(today, new Date(item.due_at));
  if (item.sla_level === 'over' || n < 0) return `quá hạn ${Math.max(Math.abs(n), 1)} ngày LV`;
  if (item.sla_level === 'today' || n === 0) return 'hạn hôm nay';
  return `còn ${n} ngày LV`;
}

export const STEP_LABEL: Record<string, string> = {
  RM_DRAFT: 'Soạn đề xuất',
  CHECKING: 'Kiểm tra hồ sơ',
  RM_REWORK: 'Sửa đề xuất',
  APPRAISAL: 'Thẩm định',
  PENDING_INFO: 'Chờ bổ sung',
  RISK_REVIEW: 'Ý kiến rủi ro',
  RISK_PENDING_INFO: 'Rủi ro chờ bổ sung',
  FRAUD_HOLD: 'Tạm dừng nghi gian lận',
  APPROVAL: 'Phê duyệt',
  COUNCIL_SESSION: 'Hội đồng tín dụng',
};

export const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Nháp',
  CHECKING: 'Đang kiểm tra',
  RETURNED_TO_RM: 'Trả về QHKH',
  APPRAISAL: 'Đang thẩm định',
  APPRAISAL_PENDING_INFO: 'Thẩm định – chờ bổ sung',
  RISK_REVIEW: 'Đang cho ý kiến rủi ro',
  RISK_PENDING_INFO: 'Rủi ro – chờ bổ sung',
  RISK_HOLD_FRAUD: 'Tạm dừng nghi gian lận',
  APPROVAL: 'Chờ phê duyệt',
  COUNCIL_SESSION: 'Trình hội đồng tín dụng',
  APPROVED: 'Đã phê duyệt',
  APPROVED_WITH_CONDITIONS: 'Phê duyệt có điều kiện',
  REJECTED: 'Từ chối',
  WITHDRAWN: 'Đã rút',
};

export const stepLabel = (code: string): string => STEP_LABEL[code] ?? code;
export const statusLabel = (code: string): string => STATUS_LABEL[code] ?? code;
