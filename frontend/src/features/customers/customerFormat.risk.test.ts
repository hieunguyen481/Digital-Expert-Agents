import { describe, expect, it } from 'vitest';
import { riskInfo } from './customerFormat';

describe('riskInfo', () => {
  it('chưa có xếp hạng hoặc mã lạ đều là "chưa xếp hạng" (null), không có hai cách ghi "—" và "Chưa rõ"', () => {
    expect(riskInfo(null)).toBeNull();
    expect(riskInfo('')).toBeNull();
    expect(riskInfo('ZZZ')).toBeNull();
  });
});
