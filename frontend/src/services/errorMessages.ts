/**
 * Bản dịch lỗi dùng chung (L04). Mọi lỗi từ backend đi qua `translateServerError`
 * trước khi hiện ra giao diện: ưu tiên bản dịch theo `code`, rồi theo lý do chi tiết,
 * và không bao giờ để lọt chuỗi tiếng Anh thô.
 */

const BY_CODE: Record<string, string> = {
  REQUEST_VALIDATION_FAILED: 'Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại các trường đã nhập.',
  VALIDATION_FAILED: 'Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại.',
  RESOURCE_NOT_FOUND: 'Không tìm thấy dữ liệu hoặc ngoài phạm vi bạn được xem.',
  ACCESS_DENIED: 'Vai trò của bạn không có quyền thực hiện thao tác này.',
  RESOURCE_EXPIRED: 'Thao tác đã hết hạn. Vui lòng thử lại.',
  INVALID_STATE_TRANSITION: 'Thao tác không hợp lệ ở trạng thái hiện tại của hồ sơ. Hãy tải lại trang.',
  HTTP_ERROR: 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.',
  APPROVED_AMOUNT_EXCEEDS_REQUESTED: 'Số tiền duyệt không được vượt số tiền đề xuất.',
  APPROVED_AMOUNT_INVALID: 'Số tiền duyệt phải lớn hơn 0.',
  APPROVED_TERM_INVALID: 'Kỳ hạn duyệt phải lớn hơn 0.',
  CIC_REPORT_BY_SYSTEM: 'Báo cáo CIC do hệ thống tra cứu, không tải lên thủ công.',
  VERSION_CONFLICT: 'Hồ sơ vừa được người khác cập nhật. Hãy tải lại trang rồi thao tác lại.',
};

/** Lý do chi tiết (tiếng Anh) mà backend gửi kèm mã chung — khớp theo mẫu. */
const BY_REASON: Array<[RegExp, string]> = [
  [/unsupported document mime type/i, 'Định dạng tệp không được hỗ trợ. Chỉ nhận PDF, Word, Excel hoặc ảnh PNG/JPG.'],
  [/document size is outside the permitted range/i, 'Kích thước tệp không hợp lệ: tệp rỗng hoặc vượt giới hạn cho phép.'],
  [/safe basename|control character/i, 'Tên tệp không hợp lệ.'],
  [/must be positive|must be greater than 0/i, 'Giá trị phải lớn hơn 0.'],
  [/requires a reason/i, 'Cần nhập lý do cho thao tác này.'],
  [/override reason is required/i, 'Cần nhập lý do khi quyết định vượt chính sách.'],
  [/requires at least one condition/i, 'Phê duyệt có điều kiện cần ít nhất một điều kiện.'],
  [/must be one of/i, 'Giá trị đã chọn không hợp lệ.'],
  [/not found|no such/i, 'Không tìm thấy dữ liệu yêu cầu.'],
];

const BY_STATUS: Record<number, string> = {
  400: 'Dữ liệu gửi lên không hợp lệ.',
  401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  403: 'Vai trò của bạn không có quyền thực hiện thao tác này.',
  404: 'Không tìm thấy dữ liệu hoặc ngoài phạm vi bạn được xem.',
  409: 'Thao tác xung đột với trạng thái hiện tại. Hãy tải lại trang rồi thử lại.',
  410: 'Thao tác đã hết hạn. Vui lòng thử lại.',
  413: 'Tệp quá lớn.',
  422: 'Dữ liệu gửi lên không hợp lệ.',
};

/** Có dấu tiếng Việt (chữ có dấu đặc trưng) thì coi là câu đã viết cho người dùng. */
const VIETNAMESE = /[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/i;

export function isVietnamese(text: string | undefined | null): boolean {
  return !!text && VIETNAMESE.test(text);
}

export function translateServerError(input: {
  status?: number;
  code?: string;
  message?: string;
  details?: unknown;
}): string {
  const { status, code, message, details } = input;
  const reason = (details as { reason?: unknown } | undefined)?.reason;
  if (typeof reason === 'string') {
    if (isVietnamese(reason)) return reason;
    const hit = BY_REASON.find(([re]) => re.test(reason));
    if (hit) return hit[1];
  }
  if (code && BY_CODE[code]) return BY_CODE[code];
  if (isVietnamese(message)) return message as string;
  if (typeof message === 'string') {
    const hit = BY_REASON.find(([re]) => re.test(message));
    if (hit) return hit[1];
  }
  return (status && BY_STATUS[status]) || (status && status >= 500 ? 'Hệ thống đang bận. Vui lòng thử lại sau ít phút.' : 'Đã có lỗi xảy ra. Vui lòng thử lại.');
}
