import { describe, expect, it } from 'vitest';
import { fieldLabel, fieldValueText } from './fieldLabels';

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
