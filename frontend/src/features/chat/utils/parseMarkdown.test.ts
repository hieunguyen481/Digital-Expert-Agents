import { describe, expect, it } from 'vitest';
import { parseInline, parseMarkdown } from './parseMarkdown';

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

describe('gạch đầu dòng lặp', () => {
  it('bỏ gạch lặp y hệt, khác dấu chấm cuối hay hoa thường', () => {
    const [n] = parseMarkdown('- Bổ sung hợp đồng.\n- Bổ sung hợp đồng\n- bổ sung  hợp đồng.\n- Cập nhật định giá');
    expect(n.type === 'bulletList' && n.items.length).toBe(2);
  });
  it('không bỏ gạch chỉ giống một phần', () => {
    const [n] = parseMarkdown('- Bổ sung hợp đồng thuê\n- Bổ sung hợp đồng bảo hiểm\n- A\n- B');
    expect(n.type === 'bulletList' && n.items.length).toBe(4);
  });
});
