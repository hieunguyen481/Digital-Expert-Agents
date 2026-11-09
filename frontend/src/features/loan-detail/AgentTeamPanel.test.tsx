import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as agentCases from '@/services/agentCaseService';
import { AgentTeamPanel } from './AgentTeamPanel';

const runs = vi.hoisted(() => ({ fetchAgentRuns: vi.fn(), startAgentRun: vi.fn() }));
vi.mock('./loanDetailService', () => runs);
vi.mock('@/services/agentCaseService', () => ({
  TERMINAL_STATES: ['Pending Approval', 'Needs Info', 'Completed', 'Rejected', 'Escalated', 'Executing'],
  getAgentCase: vi.fn(async () => ({
    case_id: 'case_1', state: 'Pending Approval', package: {
      recommendation: 'Đề xuất cấp tín dụng có điều kiện', proposed_limit: 4e9,
      verdicts: [{ agent: 'credit', decision: 'pass', summary: 'DSCR đạt', evidence: [{ source: 'BCTC 2025', quote: 'EBITDA 12 tỷ' }] }],
    },
  })),
  getAgentCaseEvents: vi.fn(async () => []),
  streamAgentCase: vi.fn(() => new Promise(() => undefined)),
}));

function mount() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><MemoryRouter><AgentTeamPanel loanId="L1" currency="VND" /></MemoryRouter></QueryClientProvider>);
}
const item = { id: 'r1', case_id: 'case_1', created_at: '2026-01-01T00:00:00Z', started_by: 'e', started_by_name: 'A' };

describe('AgentTeamPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('người được phép, chưa chạy: có nút và trạng thái chưa chạy', async () => {
    runs.fetchAgentRuns.mockResolvedValue({ can_run: true, deny_reason: null, latest: null, runs: [] });
    mount();
    expect(await screen.findByTestId('run-agent-team')).toBeTruthy();
    expect(screen.getByTestId('agent-team-empty')).toBeTruthy();
  });

  it('vai trò không được phép: không có nút, có lý do', async () => {
    runs.fetchAgentRuns.mockResolvedValue({ can_run: false, deny_reason: 'Bạn không phải người đang giữ hồ sơ này.', latest: null, runs: [] });
    mount();
    expect((await screen.findByTestId('agent-team-lock')).textContent).toContain('không phải người đang giữ');
    expect(screen.queryByTestId('run-agent-team')).toBeNull();
  });

  it('hiện đề xuất, phát hiện, trích nguồn và link trace từ dữ liệu case', async () => {
    runs.fetchAgentRuns.mockResolvedValue({ can_run: false, deny_reason: 'x', latest: item, runs: [item] });
    mount();
    await waitFor(() => expect(screen.getByTestId('agent-recommendation').textContent).toContain('có điều kiện'));
    expect(screen.getByTestId('agent-findings').textContent).toContain('DSCR đạt');
    expect(screen.getByTestId('agent-sources').textContent).toContain('EBITDA 12 tỷ');
    expect(screen.getByTestId('agent-trace-link').getAttribute('href')).toBe('/dashboard?case=case_1');
  });

  it('lỗi khi chạy (409) hiện thông báo', async () => {
    runs.fetchAgentRuns.mockResolvedValue({ can_run: true, deny_reason: null, latest: null, runs: [] });
    runs.startAgentRun.mockRejectedValue({ response: { status: 409, data: { error: { code: 'AGENT_RUN_IN_PROGRESS', message: 'Đội agent đang chạy' } } } });
    mount();
    (await screen.findByTestId('run-agent-team')).click();
    expect(await screen.findByTestId('agent-run-error')).toBeTruthy();
  });

  it('khóa nút chạy khi lượt gần nhất chưa kết thúc', async () => {
    vi.mocked(agentCases.getAgentCase).mockResolvedValueOnce({ case_id: 'case_1', state: 'In Analysis' } as never);
    runs.fetchAgentRuns.mockResolvedValue({ can_run: true, deny_reason: null, latest: item, runs: [item] });
    mount();
    await waitFor(() => expect((screen.getByTestId('run-agent-team') as HTMLButtonElement).disabled).toBe(true));
    expect(screen.getByTestId('run-agent-team').textContent).toContain('đang chạy');
  });
});
