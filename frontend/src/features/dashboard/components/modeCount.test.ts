import { describe, expect, it } from 'vitest';
import { modeCount } from './ComparisonTab';

describe('modeCount', () => {
  it('lượt chỉ có đa agent ghi 1 chế độ', () => expect(modeCount({ summary: { multi: {} } })).toContain('1 chế độ'));
  it('lượt đủ hai chế độ ghi 2 chế độ', () => expect(modeCount({ summary: { single: {}, multi: {} } })).toBe('2 chế độ'));
});
