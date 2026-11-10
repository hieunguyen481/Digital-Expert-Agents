import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LoanHeader } from './LoanHeader';
import type { LoanOverview } from './types';

function overview(loan: Record<string, unknown>): LoanOverview {
  return {
    loan: { id: 'L', application_number: 'H1', status: 'REJECTED', requested_amount: '3000000000', currency: 'VND', requested_term_months: 24, customer_name: 'KH', ...loan },
    metrics: [], flags: [], collaterals: [], timeline: [],
  } as unknown as LoanOverview;
}
const mount = (loan: Record<string, unknown>) => render(<MemoryRouter><LoanHeader overview={overview(loan)} todoCount={0} /></MemoryRouter>);

describe('LoanHeader – L04/L10', () => {
  it('hồ sơ bị từ chối không hiện số tiền được duyệt, kể cả dữ liệu cũ có số', () => {
    mount({ decision_type: 'REJECTED', approved_amount: '3000000000', approved_term_months: 24 });
    expect(screen.getByTestId('loan-header').textContent).not.toContain('Được duyệt');
  });
  it('hồ sơ được duyệt hiện số tiền được duyệt', () => {
    mount({ status: 'APPROVED', decision_type: 'APPROVED', approved_amount: '3000000000', approved_term_months: 24 });
    expect(screen.getByTestId('loan-header').textContent).toContain('Được duyệt: 3 tỷ');
  });
  it('không có người giữ thì không hiện "Đang giữ"', () => {
    mount({ assignee_name: null });
    expect(screen.getByTestId('loan-header').textContent).not.toContain('Đang giữ');
  });
});
