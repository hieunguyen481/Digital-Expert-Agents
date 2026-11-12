import { describe, expect, it } from 'vitest';
import { docButtonLabel, docTitle, stripSampleMark, fieldLabel, fieldValueText } from './fieldLabels';

describe('fieldLabel (L06)', () => {
  it('trả nhãn tiếng Việt, không lộ khóa tiếng Anh', () => {
    expect(fieldLabel('charter_capital')).toBe('Vốn điều lệ');
    expect(fieldLabel('tax_code')).toBe('Mã số thuế');
    expect(fieldLabel('khong_biet')).toBe('Trường dữ liệu');
  });
});

describe('fieldValueText P09', () => {
  it('bỏ chữ đơn vị sót trong giá trị tiền OCR', () => {
    expect(fieldValueText({ value: '5.000.000.000 dong', value_type: 'MONEY', value_number: 5e9 })).toBe('5 tỷ đồng');
    expect(fieldValueText({ value: '5.000.000 VND', value_type: 'MONEY', value_number: 5e6 })).toBe('5.000.000');
  });
});

describe('docButtonLabel', () => {
  it('tên tài liệu trùng tên mục (chỉ khác "(minh họa)") thì ghi việc nút làm', () => {
    expect(docButtonLabel('Điều lệ công ty (minh họa)', 'Điều lệ công ty.')).toBe('Xem tài liệu đã nộp');
  });
  it('tên khác tên mục thì giữ tên, bỏ hậu tố minh họa', () => {
    expect(docButtonLabel('Báo cáo tài chính 2025 (minh họa)', 'BCTC kiểm toán')).toBe('Báo cáo tài chính 2025');
  });
});

describe('stripSampleMark', () => {
  it('bỏ "(minh họa)" nhưng giữ phần thông tin còn lại', () => {
    expect(docTitle('Điều lệ công ty (minh họa)', 'x')).toBe('Điều lệ công ty');
    expect(stripSampleMark('Nhà xưởng, tách từ dòng 78 tỷ, số minh họa')).toBe('Nhà xưởng, tách từ dòng 78 tỷ');
    expect(stripSampleMark('Văn bản đồng ý tra cứu CIC (minh họa, ký 03/11/2026)')).toBe('Văn bản đồng ý tra cứu CIC (ký 03/11/2026)');
  });
});
