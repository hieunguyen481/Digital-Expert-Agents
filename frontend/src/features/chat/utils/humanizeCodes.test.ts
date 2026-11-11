import { describe, expect, it } from 'vitest';
import { humanizeCodes, scrubAnswer } from './humanizeCodes';

describe('humanizeCodes', () => {
  it('đổi mã trạng thái thô sang tiếng Việt', () => {
    expect(humanizeCodes('Trường: NEEDS_VERIFICATION và VERIFIED')).toBe('Trường: cần kiểm chứng và đã xác minh');
  });
  it('không đụng chữ khác', () => {
    expect(humanizeCodes('UNVERIFIED_X giữ nguyên')).toBe('UNVERIFIED_X giữ nguyên');
  });
});

describe('scrubAnswer', () => {
  it('gỡ mã trạng thái và tên mục kỹ thuật', () => {
    const out = scrubAnswer('hồ sơ ở trạng thái thẩm định (APPRAISAL) [nguồn: loan_applications]. Dư nợ: DỮ LIỆU không có');
    expect(out).toBe('hồ sơ ở trạng thái thẩm định (nguồn: hồ sơ vay). Dư nợ: Dữ liệu không có');
    expect(out).not.toMatch(/APPRAISAL|loan_applications/);
  });
});
