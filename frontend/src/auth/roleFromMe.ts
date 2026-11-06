/** Vai trò hiển thị trên giao diện (design-system §2.1). */
export type UiRole = 'qhkh' | 'httd' | 'tdinh' | 'ruiro' | 'pheduyet' | 'kiemtoan' | 'quantri';

export const UI_ROLE_LABEL: Record<UiRole, string> = {
  qhkh: 'Chuyên viên QHKH',
  httd: 'Hỗ trợ tín dụng',
  tdinh: 'Chuyên viên Thẩm định',
  ruiro: 'Quản lý rủi ro/Tuân thủ',
  pheduyet: 'Cấp phê duyệt',
  kiemtoan: 'Kiểm toán nội bộ',
  quantri: 'Quản trị hệ thống',
};

/** Thứ tự ưu tiên: người có nhiều vai trò chỉ ra đúng một vai trò hiển thị. */
const PRIORITY: ReadonlyArray<readonly [UiRole, readonly string[]]> = [
  ['quantri', ['admin']],
  ['kiemtoan', ['auditor']],
  ['pheduyet', ['loan_approver']],
  ['ruiro', ['risk_officer', 'compliance_officer']],
  ['tdinh', ['credit_appraiser']],
  ['httd', ['document_reviewer']],
  ['qhkh', ['credit_officer', 'credit_manager']],
];

export function uiRoleFromRoles(roles: readonly string[]): UiRole | null {
  for (const [uiRole, codes] of PRIORITY) {
    if (codes.some((code) => roles.includes(code))) return uiRole;
  }
  return null;
}
