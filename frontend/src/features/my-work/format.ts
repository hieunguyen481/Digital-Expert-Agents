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

export type DeadlineClass = 'pause' | 'none' | 'over' | 'today' | 'ok';
/** MỘT hàm phân loại hạn cho chip, bộ đếm, KPI và bộ lọc: theo thời điểm hết hạn thật, không theo số ngày hay cờ của máy chủ.
 *  Qua thời điểm hết hạn là quá hạn (kể cả trong cùng ngày); cùng ngày nhưng chưa tới giờ là hạn hôm nay; còn lại là còn hạn. */
export function deadlineClass(item: Pick<WorkItem, 'due_at' | 'paused' | 'sla_level'>, now: Date): DeadlineClass {
  if (item.paused || item.sla_level === 'pause') return 'pause';
  if (!item.due_at) return 'none';
  const due = new Date(item.due_at);
  if (Number.isNaN(due.getTime())) return 'none';
  if (now.getTime() > due.getTime()) return 'over';
  return due.toDateString() === now.toDateString() ? 'today' : 'ok';
}
/** Gắn lại `sla_level` và thẻ `over` theo `deadlineClass`, để mọi nơi đếm cùng một số. */
export function withDeadlineClass<T extends WorkItem>(item: T, now: Date): T {
  const c = deadlineClass(item, now);
  if (c === 'none') return item;
  const rest = item.tags.filter((t) => t !== 'over');
  return { ...item, sla_level: c, tags: c === 'over' ? [...rest, 'over'] : rest };
}

/** Câu SLA theo design-system §15. */
export function slaText(item: WorkItem, today: Date): string {
  const c = deadlineClass(item, today);
  if (c === 'pause') return 'tạm dừng';
  if (c === 'none') return '—';
  const n = workdaysBetween(today, new Date(item.due_at!));
  if (c === 'over') return n < 0 ? `quá hạn ${Math.abs(n)} ngày LV` : 'quá hạn hôm nay';
  if (c === 'today') return 'hạn hôm nay';
  return `còn ${n} ngày LV`;
}

export const STEP_LABEL: Record<string, string> = {
  DRAFT: 'Nháp (chưa trình)',
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
  RISK_REVIEW: 'Chờ ý kiến rủi ro',
  RISK_PENDING_INFO: 'Rủi ro – chờ bổ sung',
  RISK_HOLD_FRAUD: 'Tạm dừng nghi gian lận',
  APPROVAL: 'Chờ phê duyệt',
  COUNCIL_SESSION: 'Chờ phiên Hội đồng – có ở đợt 2',
  APPROVED: 'Đã phê duyệt',
  APPROVED_WITH_CONDITIONS: 'Phê duyệt có điều kiện',
  REJECTED: 'Từ chối',
  WITHDRAWN: 'Đã rút',
};

/** Tên trạng thái trong chữ do máy chủ viết sẵn (lý do chỉ xem) -> đúng tên chip trạng thái ở đầu trang: một trạng thái, một tên. */
const SERVER_STATUS_NAME: Record<string, string> = {
  'Đang cho ý kiến rủi ro': STATUS_LABEL.RISK_REVIEW, 'Tạm giữ do nghi gian lận': STATUS_LABEL.RISK_HOLD_FRAUD,
  'Rủi ro – chờ giải trình': STATUS_LABEL.RISK_PENDING_INFO, 'Chờ Hội đồng': 'Chờ phiên Hội đồng',
};
export function unifyStatusNames(text: string): string {
  return Object.entries(SERVER_STATUS_NAME).reduce((t, [from, to]) => t.split(from).join(to), String(text ?? ''));
}
export const stepLabel = (code: string): string => STEP_LABEL[code] ?? code;
export const statusLabel = (code: string): string => STATUS_LABEL[code] ?? code;

/** Tên khách hiển thị: hồ sơ chưa có người vay thì nói rõ thay vì "—". */
export const customerLabel = (name: string | null | undefined): string => (name && name.trim() && name.trim() !== '—' ? name : 'Chưa có tên khách');

/** Hồ sơ chưa có người vay (nháp thử nghiệm): không có gì để kiểm toán. */
export const isNameless = (i: { customer_name: string }): boolean => customerLabel(i.customer_name) === 'Chưa có tên khách';
