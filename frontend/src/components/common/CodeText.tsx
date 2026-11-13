import type { ReactNode } from 'react';

const CODE = /(HSV-\d{4}-\d+|DX-\d{4}-\d+|LA-\d{8}-[0-9A-Fa-f]{8})/g;
const mono = { fontFamily: 'var(--font-num)', fontVariantNumeric: 'tabular-nums', fontSize: '0.93em', fontWeight: 500 } as const;
export const DRAFT_NO_CODE = 'Nháp chưa đánh số';

/** Mã `LA-…` là mã tạm của hồ sơ nháp; chỉ khi còn Nháp mới ẩn đi (đã nộp thì LA- là số hồ sơ thật). */
export function loanCodeLabel(code: string | null | undefined, status?: string | null): string {
  const c = code ?? '';
  return /^LA-/.test(c) && (!status || status === 'DRAFT') ? DRAFT_NO_CODE : c;
}

/** Một hàm hiển thị mã hồ sơ cho mọi màn: mã thật in mono; nháp chưa đánh số in chữ thường xám. */
export function LoanCode({ code, status }: { code: string | null | undefined; status?: string | null }): ReactNode {
  const label = loanCodeLabel(code, status);
  return label === DRAFT_NO_CODE ? <span style={{ color: 'var(--ink-3, #6b7280)' }}>{label}</span> : <span style={{ ...mono, fontSize: 'inherit', whiteSpace: 'nowrap' }}>{label}</span>;
}

/** Văn bản có chứa mã hồ sơ: mã luôn mono (một kiểu mã hồ sơ trong toàn ứng dụng). */
export function CodeText({ children }: { children: string }): ReactNode {
  return children.split(CODE).map((part, i) => (i % 2 === 1 ? <span key={i} style={mono}>{part}</span> : part));
}
