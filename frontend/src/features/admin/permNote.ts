/** Quyền chức năng "loan:analyze" của QHKH không nằm trong ma trận (docs/business/ma-tran-phan-quyen.md mục 229):
 *  QHKH vẫn chạy đội agent ở Nháp, Trả về QHKH, Thẩm định chờ bổ sung qua kiểm tra ở service. Ô ma trận ghi chú theo bước thay vì "—" trơn. */
const STEP_PERMS: Record<string, Record<string, string>> = {
  'loan:analyze': { credit_officer: 'Theo bước: Nháp, Trả về QHKH, chờ bổ sung' },
};
export function permStepNote(roleCode: string | undefined, permCode: string | undefined): string | null {
  return STEP_PERMS[permCode ?? '']?.[roleCode ?? ''] ?? null;
}
