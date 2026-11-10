import { describe, expect, it } from 'vitest';
import { uiRoleFromRoles } from './roleFromMe';

describe('uiRoleFromRoles', () => {
  it.each([
    ['admin', 'quantri'],
    ['auditor', 'kiemtoan'],
    ['loan_approver', 'pheduyet'],
    ['risk_officer', 'ruiro'],
    ['compliance_officer', 'ruiro'],
    ['credit_appraiser', 'tdinh'],
    ['document_reviewer', 'httd'],
    ['credit_officer', 'qhkh'],
    ['credit_manager', 'truongphong'],
  ])('%s -> %s', (role, expected) => {
    expect(uiRoleFromRoles([role])).toBe(expected);
  });

  it('nhiều vai trò ra đúng một vai trò theo ưu tiên', () => {
    expect(uiRoleFromRoles(['risk_officer', 'compliance_officer'])).toBe('ruiro');
    expect(uiRoleFromRoles(['credit_manager', 'credit_officer'])).toBe('qhkh');
    expect(uiRoleFromRoles(['loan_approver', 'auditor'])).toBe('kiemtoan');
  });

  it('không khớp thì null', () => {
    expect(uiRoleFromRoles([])).toBeNull();
    expect(uiRoleFromRoles(['unknown'])).toBeNull();
  });
});
