import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { TracesTab } from './TracesTab';

const mk = (id: string, state: string) => ({ case_id: id, state, request: { amount: 1e9, purpose: 'WORKING_CAPITAL', term_months: 12 },
  tool_calls: 3, created_at: 1, updated_at: 2 });
vi.mock('@/services/agentCaseService', () => ({
  listAgentCases: vi.fn(async () => [mk('case_aaa', 'Needs Info'), mk('case_bbb', 'Pending Approval')]),
  TERMINAL_STATES: [], getAgentCase: vi.fn(), getAgentCaseEvents: vi.fn(), getApproverNames: vi.fn(), streamAgentCase: vi.fn(),
}));

describe('TracesTab', () => {
  it('lọc theo mã case', async () => {
    const qc = new QueryClient();
    render(<QueryClientProvider client={qc}><TracesTab /></QueryClientProvider>);
    await waitFor(() => expect(screen.getByTestId('case-row-case_bbb')).toBeTruthy());
    fireEvent.change(screen.getByPlaceholderText(/Tìm theo mã case/), { target: { value: 'aaa' } });
    await waitFor(() => expect(screen.queryByTestId('case-row-case_bbb')).toBeNull());
    expect(screen.getByTestId('case-row-case_aaa')).toBeTruthy();
  });
});
