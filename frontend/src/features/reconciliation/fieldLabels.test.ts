import { describe, expect, it } from 'vitest';
import { fieldLabel } from './fieldLabels';

describe('fieldLabel (L06)', () => {
  it('trả nhãn tiếng Việt, không lộ khóa tiếng Anh', () => {
    expect(fieldLabel('charter_capital')).toBe('Vốn điều lệ');
    expect(fieldLabel('tax_code')).toBe('Mã số thuế');
    expect(fieldLabel('khong_biet')).toBe('Trường dữ liệu');
  });
});
