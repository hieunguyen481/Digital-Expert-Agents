import { describe, expect, it } from 'vitest';
import { pageTextLines } from './DocumentViewer';
import type { ReconField } from './types';

const f = (o: Partial<ReconField>): ReconField => ({
  field_id: 'a', field_name: 'x', value_type: 'TEXT', value: null, value_number: null, page_number: 1,
  bounding_box: null, source_text: null, confidence: null, verification_status: 'AI_PROPOSED', ...o,
} as ReconField);

describe('pageTextLines', () => {
  it('tô giá trị trong dòng nguồn', () => {
    const [l] = pageTextLines([f({ value: '80 tỷ', source_text: 'Vốn điều lệ: 80 tỷ đồng' })]);
    expect([l.before, l.hit, l.after]).toEqual(['Vốn điều lệ: ', '80 tỷ', ' đồng']);
  });
  it('chịu được thiếu giá trị và nguồn', () => {
    expect(pageTextLines([f({}), f({ field_id: 'b', value: 'A' })]).length).toBe(2);
    expect(pageTextLines([])).toEqual([]);
  });
  it('sắp theo toạ độ y', () => {
    const r = pageTextLines([f({ field_id: 'low', bounding_box: { x: 0, y: .8, w: 1, h: 1 } }), f({ field_id: 'top', bounding_box: { x: 0, y: .1, w: 1, h: 1 } })]);
    expect(r.map((x) => x.field.field_id)).toEqual(['top', 'low']);
  });
});
