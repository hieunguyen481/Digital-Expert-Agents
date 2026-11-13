import { describe, expect, it } from 'vitest';
import { actionLabel } from './labels';
import { roleTone } from '../admin/AdminPage';

describe('nhãn nhật ký và chip vai', () => {
  it('ý kiến chuyên môn tách theo vai', () => {
    expect(actionLabel('CASE_RISK_OPINION', { kind: 'RISK' })).toBe('Ghi ý kiến rủi ro');
    expect(actionLabel('CASE_RISK_OPINION', { kind: 'COMPLIANCE' })).toBe('Ghi ý kiến tuân thủ');
    expect(actionLabel('CASE_RISK_OPINION', undefined)).toBe('Ghi ý kiến rủi ro, tuân thủ');
    expect(actionLabel('CASE_RISK_OPINION', null)).toBe('Ghi ý kiến rủi ro, tuân thủ');
  });
  it('chip vai có màu theo nhóm', () => {
    expect(roleTone('risk_officer')).toBe('info');
    expect(roleTone('auditor')).toBe('info');
    expect(roleTone('system_admin')).toBe('human');
    expect(roleTone('credit_officer')).toBe('neutral');
    expect(roleTone(undefined as unknown as string)).toBe('neutral');
  });
});
