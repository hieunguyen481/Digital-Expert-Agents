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
