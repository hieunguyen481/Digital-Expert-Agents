import { fmtDay, fmtVnd } from '@/utils/format';
export const fmtNum = (n: number | null | undefined, unit = ''): string =>
  n == null ? '—' : `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(n)}${unit ? ` ${unit}` : ''}`;

export const fmtDate = (iso: string | null | undefined): string =>
  iso ? fmtDay(iso) : '—';

/** Đơn vị tiền ghi bằng chữ: VND → "đồng". */
export const currencyWord = (c: string): string => (c === 'VND' ? 'đồng' : c);

export const fmtMoney = (v: string | null, currency: string): string =>
  v == null ? '—' : currency === 'VND' ? fmtVnd(Number(v)) : `${new Intl.NumberFormat('vi-VN').format(Number(v))} ${currency}`;

const SOURCE_TYPE: Record<string, string> = {
  OCR: 'OCR', AI_OCR: 'AI trích xuất', AI: 'AI đề xuất', MANUAL: 'Nhập tay', HUMAN: 'Người nhập',
  SYSTEM_CIC: 'Hệ thống CIC', SYSTEM_CORE: 'Hệ thống lõi ngân hàng', SYSTEM: 'Hệ thống', CUSTOMER: 'Khách hàng khai báo', DOCUMENT: 'Tài liệu',
};
/** Loại nguồn theo tiếng Việt; mã chưa có nhãn rơi về chữ thường dễ đọc, không lộ mã thô. */
export const sourceTypeLabel = (t: string | null): string =>
  t ? SOURCE_TYPE[t] ?? (/^[A-Z0-9_]+$/.test(t) ? t.toLowerCase().replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : t) : 'Không rõ loại nguồn';

export const KIND_LABEL = { DECLARED: 'Khai báo', RECOMPUTED: 'Tính lại' } as const;

const SEVERITY: Record<string, string> = { HIGH: 'Cao', MEDIUM: 'Trung bình', LOW: 'Thấp' };
export const severityLabel = (s: string): string => SEVERITY[s] ?? s;

const FLAG_STATUS: Record<string, string> = { OPEN: 'đang mở', HANDLED: 'đã xử lý', CONCLUDED: 'đã kết luận' };
export const flagStatusLabel = (s: string): string => FLAG_STATUS[s] ?? s;

const FLAG_SOURCE: Record<string, string> = {
  SYSTEM: 'Hệ thống', GATE: 'Cổng kiểm tra điều kiện', AI_DOCUMENT_CHECK: 'AI kiểm tra tài liệu', CHECKING: 'Kiểm tra hồ sơ', APPRAISAL: 'Thẩm định',
};
/** Nguồn cờ dạng `GATE:rm_submit` -> `Cổng kiểm tra điều kiện`; không để mã kỹ thuật lộ ra. */
export const flagSourceLabel = (s: string): string => FLAG_SOURCE[s.split(':')[0]] ?? 'Hệ thống';

const VALUATION: Record<string, string> = {
  DECLARED: 'Khách khai báo', APPRAISED: 'Đã thẩm định giá', PENDING: 'Chờ định giá', NEEDS_VERIFICATION: 'Cần kiểm chứng',
};
export const valuationLabel = (s: string | null): string => (s ? VALUATION[s] ?? s : '—');

const OWNERSHIP: Record<string, string> = {
  VERIFIED: 'đã xác minh', AI_PROPOSED: 'AI đề xuất, chưa xác nhận', NEEDS_VERIFICATION: 'cần kiểm chứng', PENDING: 'chờ xác minh',
};
export const ownershipLabel = (s: string | null): string => (s ? OWNERSHIP[s] ?? s : '—');

const STEP_RESULT: Record<string, string> = {
  SUBMITTED: 'đã trình', PASSED: 'đạt', RETURNED: 'trả lại', PASS: 'đạt', FAIL: 'không đạt',
  ACCEPTED: 'đã chấp thuận', APPROVED: 'đã phê duyệt', APPROVED_WITH_CONDITIONS: 'phê duyệt có điều kiện',
  REJECTED: 'từ chối', WITHDRAWN: 'đã rút', CANCELLED: 'đã hủy', SUPPLEMENT_REQUESTED: 'yêu cầu bổ sung',
};
export const stepResultLabel = (s: string | null): string => (s ? STEP_RESULT[s] ?? 'đã xử lý' : '');

const CONCLUSION: Record<string, string> = {
  SUSPECTED_FRAUD: 'Nghi gian lận', INSUFFICIENT_BASIS: 'Chưa đủ căn cứ', NO_ISSUE: 'Không có vấn đề',
};
export const conclusionLabel = (s: string): string => CONCLUSION[s] ?? s;
