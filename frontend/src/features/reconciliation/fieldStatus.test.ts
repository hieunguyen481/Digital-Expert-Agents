import { describe, expect, it } from 'vitest';
import { fieldStatusLabel, highlightStyle, needsHuman } from './fieldStatus';
import type { ReconField } from './types';

const base = { verification_status: 'AI_PROPOSED', verified_by_name: null } as ReconField;

describe('fieldStatus', () => {
  it('gắn nhãn AI đề xuất cho giá trị AI điền', () => {
    expect(fieldStatusLabel(base).text).toBe('AI đề xuất');
    expect(needsHuman(base)).toBe(true);
  });
  it('chỉ hiện "Đã xác nhận bởi" khi có người xác nhận', () => {
    const f = { ...base, verification_status: 'CONFIRMED', verified_by_name: 'Nguyễn A' };
    expect(fieldStatusLabel(f).text).toBe('Đã xác nhận bởi Nguyễn A');
    expect(needsHuman(f)).toBe(false);
  });
  it('đổi vùng tô sang phần trăm khung trang', () => {
    const f = { ...base, bounding_box: { x: 0.08, y: 0.12, w: 0.84, h: 0.05 } } as ReconField;
    expect(highlightStyle(f)).toEqual({ left: '8.00%', top: '12.00%', width: '84.00%', height: '5.00%' });
    expect(highlightStyle({ ...base, bounding_box: null } as ReconField)).toBeNull();
  });
});
