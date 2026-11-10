import { describe, expect, it } from 'vitest';
import { billionToVnd, vndToBillion } from './draftForm';

describe('draftForm', () => {
  it('đổi tỷ đồng sang VND không qua số thực', () => {
    expect(billionToVnd('7,5')).toBe('7500000000');
    expect(billionToVnd('80')).toBe('80000000000');
    expect(billionToVnd('0')).toBeNull();
    expect(billionToVnd('abc')).toBeNull();
  });
  it('đổi VND về tỷ đồng', () => {
    expect(vndToBillion('80000000000.0000')).toBe('80');
    expect(vndToBillion('7500000000')).toBe('7,5');
  });
});

describe('validate form tạo đề xuất (L10)', () => {
  it('báo lỗi số tiền và kỳ hạn sai, chấp nhận giá trị hợp lệ', async () => {
    const { validateAmount, validateTerm } = await import('./draftForm');
    expect(validateAmount('')).toBeNull();
    expect(validateAmount('abc')).toMatch(/số dương/);
    expect(validateAmount('-5')).toMatch(/số dương/);
    expect(validateAmount('0')).toMatch(/lớn hơn 0/);
    expect(validateAmount('10.55555')).toMatch(/thập phân/);
    expect(validateAmount('7,5')).toBeNull();
    expect(validateTerm('0')).toMatch(/tối thiểu/);
    expect(validateTerm('6.5')).toMatch(/số nguyên/);
    expect(validateTerm('1200')).toMatch(/tối đa 600/);
    expect(validateTerm('36')).toBeNull();
  });
});
