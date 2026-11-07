export const fmtNum = (n: number | null | undefined, unit = ''): string =>
  n == null ? '—' : `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(n)}${unit ? ` ${unit}` : ''}`;

export const fmtDate = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—';

export const fmtMoney = (v: string | null, currency: string): string =>
  v == null ? '—' : `${new Intl.NumberFormat('vi-VN').format(Number(v))} ${currency}`;

const SOURCE_TYPE: Record<string, string> = {
  OCR: 'OCR', AI: 'AI đề xuất', MANUAL: 'Nhập tay', HUMAN: 'Người nhập',
};
export const sourceTypeLabel = (t: string | null): string => (t ? SOURCE_TYPE[t] ?? t : 'Không rõ loại nguồn');

export const KIND_LABEL = { DECLARED: 'Khai báo', RECOMPUTED: 'Tính lại' } as const;
