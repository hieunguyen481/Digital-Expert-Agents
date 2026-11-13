import { describe, expect, it } from 'vitest';
import { permStepNote } from './permNote';

describe('permStepNote', () => {
  it('QHKH chạy phân tích theo bước, không phải "—"', () => {
    expect(permStepNote('credit_officer', 'loan:analyze')).toMatch(/Nháp/);
  });
  it('vai khác và quyền khác không có ghi chú; chịu undefined', () => {
    expect(permStepNote('auditor', 'loan:analyze')).toBeNull();
    expect(permStepNote('credit_officer', 'loan:create')).toBeNull();
    expect(permStepNote(undefined, undefined)).toBeNull();
  });
});
