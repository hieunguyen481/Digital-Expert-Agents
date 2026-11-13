import { describe, expect, it } from 'vitest';
import { parseInline } from './parseMarkdown';

describe('parseInline gạch dưới', () => {
  it('_…_ thành chữ nghiêng, không in dấu gạch dưới thô', () => {
    expect(parseInline('Kết quả _từ đội agent_ xong')).toEqual([
      { type: 'text', value: 'Kết quả ' }, { type: 'italic', value: 'từ đội agent' }, { type: 'text', value: ' xong' },
    ]);
  });
  it('tên có gạch dưới (snake_case) không bị nghiêng', () => {
    expect(parseInline('trường loan_application_id')).toEqual([{ type: 'text', value: 'trường loan_application_id' }]);
  });
  it('chịu được chuỗi rỗng', () => { expect(parseInline('')).toEqual([]); });
});
