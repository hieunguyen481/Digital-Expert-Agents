import { describe, expect, it } from 'vitest';
import { casesNotBetter } from './blindRuns';

const c = (s: number, m: number) => ({ single: { finding_recall: { mean: s } }, multi: { finding_recall: { mean: m } } });

describe('casesNotBetter', () => {
  it('liệt kê ca đội agent bằng hoặc thấp hơn, theo thứ tự số', () => {
    expect(casesNotBetter({ J10: c(0.6, 0.5), J2: c(0.5, 0.5), J3: c(0.4, 0.8) }).map((x) => x.id)).toEqual(['J2', 'J10']);
  });
  it('rỗng khi đội agent hơn mọi ca', () => {
    expect(casesNotBetter({ J1: c(0.1, 0.9) })).toEqual([]);
  });
});
