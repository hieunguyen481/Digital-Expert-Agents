import { decimalVi, lowerShouting, stripRuleCodes } from '@/features/dashboard/agentTrace';

/** Đổi mã trạng thái thô trong câu trả lời của trợ lý sang chữ tiếng Việt (chỉ để hiển thị). */
const CODES: Record<string, string> = {
  NEEDS_VERIFICATION: 'cần kiểm chứng',
  AI_PROPOSED: 'AI đề xuất, chưa xác nhận',
  UNVERIFIED: 'chưa xác minh',
  VERIFIED: 'đã xác minh',
  MANUAL_VERIFIED: 'đã xác minh thủ công',
  REJECTED: 'bị từ chối',
};
const PATTERN = new RegExp(`\\b(${Object.keys(CODES).join('|')})\\b`, 'g');

export function humanizeCodes(text: string): string {
  return text.replace(PATTERN, (code) => CODES[code] ?? code);
}

/** Tên mục dữ liệu kỹ thuật lọt vào câu trả lời -> tên nghiệp vụ (cùng bảng với backend `scrub_raw_names`). */
const SOURCES: Record<string, string> = {
  customer_overview: 'hồ sơ khách hàng', loan_applications: 'hồ sơ vay', existing_obligations: 'dư nợ hiện hữu',
  transaction_summary: 'tổng hợp giao dịch', recent_transactions: 'giao dịch gần đây',
  existing_obligations_note: 'dư nợ hiện hữu', recent_transactions_note: 'giao dịch gần đây',
};
const STATUS: Record<string, string> = {
  APPRAISAL: 'thẩm định', RISK_REVIEW: 'ý kiến rủi ro', APPROVAL: 'chờ phê duyệt', DRAFT: 'nháp', CHECKING: 'kiểm tra',
  APPROVED: 'đã phê duyệt', RETURNED_TO_RM: 'trả về QHKH', WITHDRAWN: 'đã rút',
};
const SRC_RE = new RegExp(`\\b(${Object.keys(SOURCES).sort((a, b) => b.length - a.length).join('|')})\\b`, 'g');
const STATUS_RE = new RegExp(`\\s*\\((${Object.keys(STATUS).join('|')})\\)`, 'g');

/** Làm sạch câu trả lời để hiển thị: bỏ mã trạng thái trong ngoặc, đổi tên mục dữ liệu, bỏ chữ in hoa kiểu nhãn. */
export function scrubAnswer(text: string): string {
  return lowerShouting(stripRuleCodes(decimalVi(humanizeCodes(text ?? '')
    .replace(STATUS_RE, '')
    .replace(/\[nguồn:\s*([^\]]+)\]/gi, (_m, src: string) => `(nguồn: ${src.trim()})`)
    .replace(SRC_RE, (k) => SOURCES[k] ?? k)
    .replace(/\bDỮ LIỆU\b/g, 'Dữ liệu'))));
}
