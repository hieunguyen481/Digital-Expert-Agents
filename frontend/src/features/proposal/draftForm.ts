import type { Draft, DraftForm, DraftSaveBody } from './types';

const BILLION = 1_000_000_000n;

/** "80000000000.0000" → "80"; "7500000000" → "7,5" (giữ chuỗi, không qua số thực). */
export function vndToBillion(vnd: string): string {
  const [whole, frac = ''] = vnd.split('.');
  const n = BigInt(whole || '0');
  const rest = (n % BILLION).toString().padStart(9, '0').replace(/0+$/, '');
  const head = (n / BILLION).toString();
  void frac;
  return rest ? `${head},${rest.slice(0, 4)}` : head;
}

/** "7,5" | "7.5" → "7500000000"; null nếu không hợp lệ hoặc ≤ 0. */
export function billionToVnd(text: string): string | null {
  const t = text.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,4})?$/.test(t)) return null;
  const [w, f = ''] = t.split('.');
  const vnd = BigInt(w) * BILLION + BigInt((f + '000000000').slice(0, 9));
  return vnd > 0n ? vnd.toString() : null;
}

export function draftToForm(d: Draft): DraftForm {
  return {
    productId: d.product_id,
    amountBillion: vndToBillion(d.requested_amount),
    termMonths: String(d.requested_term_months),
    purposeText: d.purpose_text ?? '',
    repaymentText: d.repayment_source_text ?? '',
    secured: d.secured,
  };
}

/** Trả null khi form chưa đủ hợp lệ để lưu (số tiền/kỳ hạn phải dương); nháp cũ giữ nguyên. */
export function formToSaveBody(form: DraftForm, version: number): DraftSaveBody | null {
  const amount = billionToVnd(form.amountBillion);
  const term = /^\d+$/.test(form.termMonths.trim()) ? Number(form.termMonths) : 0;
  if (!amount || term <= 0 || !form.productId) return null;
  return {
    product_id: form.productId,
    requested_amount: amount,
    requested_term_months: term,
    purpose_text: form.purposeText.trim() || null,
    repayment_source_text: form.repaymentText.trim() || null,
    secured: form.secured,
    version,
  };
}

export function sameForm(a: DraftForm, b: DraftForm): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export const MAX_TERM_MONTHS = 600;

/** Lỗi nhập ở form tạo đề xuất (L10): chuỗi rỗng là chưa nhập, chưa báo lỗi. */
export function validateAmount(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  if (!/^\d+([.,]\d+)?$/.test(t)) return 'Nhập số dương, ví dụ 7,5 (đơn vị tỷ đồng).';
  if (!/^\d+([.,]\d{1,4})?$/.test(t)) return 'Tối đa 4 chữ số thập phân.';
  if (!billionToVnd(t)) return 'Số tiền phải lớn hơn 0.';
  if (Number(t.replace(',', '.')) > 1_000_000) return 'Số tiền vượt giới hạn nhập (1.000.000 tỷ đồng).';
  return null;
}

export function validateTerm(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  if (!/^\d+$/.test(t)) return 'Kỳ hạn là số nguyên tháng, ví dụ 36.';
  const n = Number(t);
  if (n < 1) return 'Kỳ hạn tối thiểu 1 tháng.';
  if (n > MAX_TERM_MONTHS) return `Kỳ hạn tối đa ${MAX_TERM_MONTHS} tháng.`;
  return null;
}
