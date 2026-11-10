import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { TracesTab } from './TracesTab';
import { MemoryRouter } from 'react-router-dom';

const mk = (id: string, state: string) => ({ case_id: id, state, request: { amount: 1e9, purpose: 'WORKING_CAPITAL', term_months: 12 },
  customer_name: 'Công ty A', application_number: 'HSV-2026-00187', loan_id: 'l1', tool_calls: 3, created_at: 1, updated_at: 2 });
vi.mock('@/services/agentCaseService', () => ({
  listAgentCases: vi.fn(async () => [mk('case_aaa', 'Needs Info'), mk('case_bbb', 'Pending Approval'), { ...mk('case_ddd', 'Draft'), tool_calls: 0 },
    { ...mk('case_ttt', 'Completed'), application_number: 'LA-9' }, { ...mk('case_nnn', 'Completed'), application_number: null }]),
  TERMINAL_STATES: [], getAgentCase: vi.fn(), getAgentCaseEvents: vi.fn(), getApproverNames: vi.fn(), streamAgentCase: vi.fn(),
}));

describe('TracesTab', () => {
  it('lọc theo mã case', async () => {
    const qc = new QueryClient();
    render(<MemoryRouter><QueryClientProvider client={qc}><TracesTab /></QueryClientProvider></MemoryRouter>);
    await waitFor(() => expect(screen.getByTestId('case-row-case_bbb')).toBeTruthy());
    fireEvent.change(screen.getByPlaceholderText(/Tìm theo khách hàng/), { target: { value: 'aaa' } });
    await waitFor(() => expect(screen.queryByTestId('case-row-case_bbb')).toBeNull());
    expect(screen.getByTestId('case-row-case_aaa')).toBeTruthy();
  });

  it('ẩn mặc định lượt nháp chưa gọi công cụ', async () => {
    render(<MemoryRouter><QueryClientProvider client={new QueryClient()}><TracesTab /></QueryClientProvider></MemoryRouter>);
    await waitFor(() => expect(screen.getByTestId('case-row-case_aaa')).toBeTruthy());
    expect(screen.queryByTestId('case-row-case_ddd')).toBeNull();
    fireEvent.click(screen.getByTestId('trace-show-empty'));
    await waitFor(() => expect(screen.getByTestId('case-row-case_ddd')).toBeTruthy());
  });

  it('hồ sơ do cán bộ tạo (LA-) hiện mặc định; ca không gắn hồ sơ ẩn sau bộ lọc (C3)', async () => {
    render(<MemoryRouter><QueryClientProvider client={new QueryClient()}><TracesTab /></QueryClientProvider></MemoryRouter>);
    await waitFor(() => expect(screen.getByTestId('case-row-case_aaa')).toBeTruthy());
    expect(screen.getByTestId('case-row-case_ttt')).toBeTruthy();
    expect(screen.queryByTestId('case-row-case_nnn')).toBeNull();
    fireEvent.click(screen.getByTestId('trace-show-test'));
    await waitFor(() => expect(screen.getByTestId('case-row-case_nnn')).toBeTruthy());
    expect(screen.getByTestId('case-row-case_nnn')).toBeTruthy();
  });
});
