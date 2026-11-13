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
    expect(await screen.findByText(/Từ đội agent, chưa xác nhận: Mở tài khoản/)).toBeTruthy();
    expect(screen.getByText(/Từ quyết định: Bảo hiểm tài sản/)).toBeTruthy();
  });
  it('chưa phê duyệt: chỉ hiện điều kiện đã xác nhận, kèm người và thời điểm; AI đề xuất phân biệt với người nhập', () => {
    wrap(<PreDisbursementPanel loanId="l1" status="APPROVAL_PENDING" confirmed={[
      { id: '1', text: 'Hoàn tất đăng ký tài sản', origin: 'AGENT_PROPOSED', confirmed_by_name: 'Nguyễn Văn A', created_at: '2026-11-13T02:00:00Z' },
      { id: '2', text: 'Ký phụ lục', origin: 'MANUAL', confirmed_by_name: 'Trần B', created_at: '2026-11-13T03:00:00Z' },
    ]} />);
    const rows = screen.getAllByTestId('pre-disbursement-confirmed');
    expect(rows[0].textContent).toMatch(/AI đề xuất.*Đã được người xác nhận.*Nguyễn Văn A · 09:00/);
    expect(rows[1].textContent).not.toMatch(/AI đề xuất/);
    expect(screen.queryByTestId('pre-disbursement-empty')).toBeNull();
  });
  it('rỗng: một dòng "Chưa có điều kiện nào được ghi"', () => {
    wrap(<PreDisbursementPanel loanId="l1" status="APPROVAL_PENDING" />);
    expect(screen.getByTestId('pre-disbursement-empty').textContent).toBe('Chưa có điều kiện nào được ghi');
  });
});
