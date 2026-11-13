/** Nhãn tiếng Việt cho mã hành động và loại đối tượng của nhật ký kiểm toán; mã gốc hiện ở dạng phụ. */
export const ACTION_LABELS: Record<string, string> = {
  WORKFLOW_SUBMIT_TO_CHECKING: 'Gửi hồ sơ kiểm tra',
  WORKFLOW_PASS_TO_APPRAISAL: 'Chuyển sang Thẩm định',
  WORKFLOW_SUBMIT_TO_RISK: 'Trình Rủi ro',
  WORKFLOW_SUBMIT_TO_APPROVAL: 'Trình phê duyệt',
  WORKFLOW_ACCEPT_INFO: 'Ghi nhận bổ sung',
  WORKFLOW_DECIDE: 'Quyết định hồ sơ',
  WORKFLOW_RETURN_FOR_SUPPLEMENT: 'Trả lại để bổ sung',
  WORKFLOW_REQUEST_INFO: 'Yêu cầu bổ sung',
  WORKFLOW_RISK_RETURN: 'Rủi ro trả lại Thẩm định',
  WORKFLOW_WITHDRAW: 'Rút hồ sơ',
  WORKFLOW_RETURN_TO_RM: 'Trả lại QHKH',
  WORKFLOW_EXTEND_DEADLINE: 'Gia hạn bổ sung',
  WORKFLOW_FRAUD_HOLD: 'Tạm dừng do nghi gian lận',
  WORKFLOW_FRAUD_RELEASE: 'Gỡ tạm dừng gian lận',
  WORKFLOW_ACCEPT_EXPLANATION: 'Chấp nhận giải trình',
  WORKFLOW_REQUEST_EXPLANATION: 'Yêu cầu giải trình',
  WORKFLOW_REASSIGN: 'Chuyển người xử lý',
  CASE_FLAG_HANDLE: 'Xử lý cờ',
  CASE_FLAG_CONCLUDE: 'Kết luận cờ',
  CASE_RISK_OPINION: 'Ghi ý kiến rủi ro, tuân thủ',
  CASE_EARLY_WARNING: 'Báo sớm Tuân thủ',
  CASE_DISBURSEMENT_CONDITION_ADD: 'Thêm điều kiện giải ngân',
  CASE_AGENT_FLAG_ADD: 'Ghi cờ từ đề xuất agent',
  CASE_APPROVAL_UPGRADE: 'Nâng cấp phê duyệt',
  DOCUMENT_FIELD_CORRECTED: 'Sửa giá trị trích xuất',
  DOCUMENT_UPLOAD_CREATED: 'Mở phiên tải tài liệu',
  DOCUMENT_UPLOADED: 'Tải tài liệu lên',
  CUSTOMER_ASSIGNMENT_CLAIMED: 'Nhận khách hàng',
  CUSTOMER_VIEWED: 'Xem khách hàng',
  LOAN_DECISION_CREATED: 'Ghi quyết định phê duyệt',
  DEMO_ACCOUNT_SWITCH: 'Quản trị đổi sang vai demo',
};

export const RESOURCE_LABELS: Record<string, string> = {
  CUSTOMER: 'Khách hàng',
  DOCUMENT_FIELD: 'Trường trích xuất',
  DOCUMENT_VERSION: 'Phiên bản tài liệu',
  EMPLOYEE: 'Nhân viên',
  LOAN_APPLICATION: 'Hồ sơ vay',
  LOAN_DECISION: 'Quyết định phê duyệt',
  UPLOAD_SESSION: 'Phiên tải lên',
};

export const RESULT_LABELS: Record<string, string> = { SUCCESS: 'Thành công', FAILURE: 'Thất bại', DENIED: 'Bị từ chối' };

export const actionLabel = (code: string) => ACTION_LABELS[code] ?? code;
