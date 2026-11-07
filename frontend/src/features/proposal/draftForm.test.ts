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
