import { describe, expect, it } from 'vitest';
import { humanizeCodes } from './humanizeCodes';

describe('humanizeCodes', () => {
  it('đổi mã trạng thái thô sang tiếng Việt', () => {
    expect(humanizeCodes('Trường: NEEDS_VERIFICATION và VERIFIED')).toBe('Trường: cần kiểm chứng và đã xác minh');
  });
  it('không đụng chữ khác', () => {
    expect(humanizeCodes('UNVERIFIED_X giữ nguyên')).toBe('UNVERIFIED_X giữ nguyên');
  });
});
