import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionsPanel } from './ActionsPanel';
import type { LoanOverview } from './types';

const svc = vi.hoisted(() => ({ fetchActionState: vi.fn() }));
const me = vi.hoisted(() => ({ roles: ['loan_approver'] as string[] }));
vi.mock('./loanDetailService', () => svc);
vi.mock('@/auth/session', () => ({ useMe: () => ({ data: { employee_id: 'e1', roles: me.roles } }) }));

function overview(status: string): LoanOverview {
  return { loan: { id: 'L', application_number: 'H1', status, requested_amount: '2000000000', currency: 'VND', requested_term_months: 12 },
    metrics: [], flags: [], collaterals: [], timeline: [] } as unknown as LoanOverview;
}
const state = (extra: Record<string, unknown>) => ({
  version: 2, status: 'X', memo_revision: null, blockers: [], opinions: [], pending_exceptions: [], excluded: false, tier: { submitted: 1, required: 1, upgrade_due: false }, can_write: true, ...extra,
});
function mount(status: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><ActionsPanel loanId="L" overview={overview(status)} /></QueryClientProvider>);
}

describe('ActionsPanel – QA3-01 người không giữ bước', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cấp phê duyệt không giữ bước: nút Quyết định khóa kèm lý do', async () => {
    me.roles = ['loan_approver'];
    svc.fetchActionState.mockResolvedValue(state({ can_write: false }));
    mount('APPROVAL');
    const btn = await screen.findByRole('button', { name: 'Quyết định' });
    expect(btn).toBeDisabled();
    expect(btn.getAttribute('title')).toContain('người đang giữ bước');
    expect(screen.getByTestId('not-holder-notice')).toBeTruthy();
  });

  it('người giữ bước: nút Quyết định dùng được, không có thông báo khóa', async () => {
    me.roles = ['loan_approver'];
    svc.fetchActionState.mockResolvedValue(state({ can_write: true }));
    mount('APPROVAL');
    expect(await screen.findByRole('button', { name: 'Quyết định' })).toBeEnabled();
    expect(screen.queryByTestId('not-holder-notice')).toBeNull();
  });

  it('Tuân thủ không giữ bước vẫn ghi được ý kiến (Q-N)', async () => {
    me.roles = ['compliance_officer'];
    svc.fetchActionState.mockResolvedValue(state({ can_write: false }));
    mount('RISK_REVIEW');
    expect(await screen.findByRole('button', { name: 'Ghi ý kiến Tuân thủ' })).toBeEnabled();
    expect(screen.queryByTestId('not-holder-notice')).toBeNull();
  });
});
