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
