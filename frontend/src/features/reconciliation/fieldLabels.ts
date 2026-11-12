/** Nhãn tiếng Việt cho khóa trường trích xuất (L06). Dùng chung cho vùng tô, danh sách trường, thẻ trường, xung đột. */
const FIELD_LABEL: Record<string, string> = {
  company_name: 'Tên doanh nghiệp', tax_code: 'Mã số thuế', legal_representative: 'Người đại diện pháp luật',
  charter_capital: 'Vốn điều lệ', net_monthly_salary: 'Lương ròng hằng tháng',
  rev: 'Doanh thu', np: 'Lợi nhuận sau thuế', ebit: 'EBIT', ebitda: 'EBITDA', ebitdam: 'Biên EBITDA',
  ta: 'Tổng tài sản', eq: 'Vốn chủ sở hữu', debt: 'Nợ vay', da: 'Khấu hao', int: 'Chi phí lãi vay',
  cfo: 'Dòng tiền kinh doanh', cfo_ph: 'Dòng tiền kinh doanh (kỳ trước)', cfi: 'Dòng tiền đầu tư',
  ar: 'Phải thu khách hàng', inv: 'Hàng tồn kho', cl: 'Nợ ngắn hạn', prin: 'Gốc phải trả kỳ tới',
  dscr: 'DSCR', dscr_ebitda128: 'DSCR (EBITDA, hệ số 1,28)', dti: 'Nợ vay/EBITDA', icr: 'EBIT/Chi phí lãi vay',
  dso: 'Kỳ thu tiền bình quân', ltv: 'LTV', de: 'Nợ phải trả/VCSH', cr: 'Thanh toán hiện hành', qr: 'Thanh toán nhanh',
  debt_group: 'Nhóm nợ', outstanding_tctd_a: 'Dư nợ TCTD (a)', outstanding_tctd_b: 'Dư nợ TCTD (b)', total: 'Tổng cộng',
};

export const fieldLabel = (name: string): string => FIELD_LABEL[name] ?? 'Trường dữ liệu';

/** Nhãn của khóa trường nếu biết; không biết thì giữ nguyên chữ gốc (mã xung đột có thể đã là chữ đọc được). */
export const fieldLabelOr = (name: string): string => FIELD_LABEL[name.toLowerCase()] ?? name;

const SOURCE_TYPE: Record<string, string> = {
  AI_OCR: 'AI trích xuất', SYSTEM_CIC: 'Hệ thống CIC', SYSTEM_CORE: 'Hệ thống lõi ngân hàng', SYSTEM: 'Hệ thống',
  MANUAL: 'Người nhập tay', CUSTOMER: 'Khách hàng khai báo', DOCUMENT: 'Tài liệu', SEED: 'Dữ liệu mẫu',
};

/** Nguồn của giá trị theo tiếng Việt; mã không biết được đổi sang dạng đọc được thay vì lộ mã thô. */
export const sourceTypeLabel = (t: string): string =>
  SOURCE_TYPE[t] ?? (/^[A-Z0-9_]+$/.test(t) ? t.toLowerCase().replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : t);

/** Giá trị trường kèm đơn vị theo loại: tiền lớn ghi "tỷ đồng", phần trăm ghi "%". Không biết loại thì giữ nguyên. */
export function fieldValueText(f: { value: string | null; value_type?: string; value_number: number | null }): string {
  if (f.value == null) return '—';
  if (f.value_type === 'MONEY') {
    // Tệp OCR hay để sót đơn vị ("dong", "VND", "đồng"): bỏ phần chữ đuôi trước khi ghép đơn vị chuẩn.
    const num = f.value.replace(/\s*(?:vn[dđ]|đồng|dong|d)\.?\s*$/i, '').trim();
    if (f.value_number != null && Math.abs(f.value_number) >= 1e9) {
      // Giá trị thô là số đồng đầy đủ (5.000.000.000) thì đổi sang tỷ; còn lại (đã là "80") chỉ thêm đơn vị.
      const digits = Number(num.replace(/[.,\s]/g, ''));
      if (digits === f.value_number) return `${(f.value_number / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ đồng`;
      return `${num} tỷ đồng`;
    }
    return num;
  }
  if (f.value_type === 'PERCENT') return `${f.value}%`;
  return f.value;
}

/** Tách mã kỹ thuật khỏi câu nguồn: "DONGY · Tờ trình" → { text: "Tờ trình", code: "DONGY" }; "Dữ liệu mẫu · cfo" → { text: "Dữ liệu mẫu", code: "cfo" }. */
export function splitSourceCode(t: string): { text: string; code: string | null } {
  const pre = t.match(/^([A-Z0-9][A-Z0-9-]{2,})\s·\s(.+)$/);
  if (pre) return { text: pre[2], code: pre[1] };
  const suf = t.match(/^(.+?)\s·\s([a-z][a-z0-9_]*)$/);
  if (suf) return { text: suf[1], code: suf[2] };
  return { text: t, code: null };
}

/** Tên tài liệu cho người đọc: bỏ tiền tố mã loại ("DKKD · Giấy phép" → "Giấy phép"). */
export function docTitle(title: string | null | undefined, fallback: string): string {
  if (!title) return fallback;
  const m = title.match(/^[A-Z0-9][A-Z0-9-]+\s·\s(.+)$/);
  return m ? m[1] : splitSourceCode(title).text;
}

const norm = (t: string) => t.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[\s.]+$/g, '').trim();

/** Nút mở tài liệu trong một mục danh mục: tên trùng tên mục (chỉ khác hậu tố "(minh họa)") thì không lặp lại, ghi việc nút làm. */
export function docButtonLabel(title: string, itemLabel: string): string {
  const clean = title.replace(/\s*\((?:minh họa|mẫu)\)\s*$/i, '').trim();
  return norm(clean) === norm(itemLabel) ? 'Xem tài liệu đã nộp' : clean;
}
