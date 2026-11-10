import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { PreDisbursementPanel } from './PreDisbursementPanel';

vi.mock('./loanDetailService', () => ({ fetchAgentRuns: vi.fn().mockResolvedValue({ latest: { case_id: 'c1' } }) }));
vi.mock('@/services/agentCaseService', () => ({
  getAgentCase: vi.fn().mockResolvedValue({ package: { conditions: ['Mở tài khoản thanh toán trước giải ngân'] } }),
}));

const wrap = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

describe('PreDisbursementPanel', () => {
  it('liệt kê điều kiện từ quyết định và đội agent khi đã phê duyệt', async () => {
    wrap(<PreDisbursementPanel loanId="l1" status="APPROVED_WITH_CONDITIONS" decisionConditions={['Bảo hiểm tài sản']} />);
    expect(await screen.findByText(/Từ đội agent: Mở tài khoản/)).toBeTruthy();
    expect(screen.getByText(/Từ quyết định: Bảo hiểm tài sản/)).toBeTruthy();
  });
  it('không hiển thị khi chưa phê duyệt', () => {
    const { container } = wrap(<PreDisbursementPanel loanId="l1" status="APPROVAL_PENDING" />);
    expect(container.textContent).toBe('');
  });
});
