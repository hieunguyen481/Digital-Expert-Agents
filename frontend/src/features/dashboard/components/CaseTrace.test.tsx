import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as svc from '@/services/agentCaseService';
import { CaseTrace } from './CaseTrace';

vi.mock('@/services/agentCaseService', () => ({
  TERMINAL_STATES: ['Pending Approval', 'Needs Info', 'Completed', 'Rejected', 'Escalated', 'Executing'],
  getAgentCase: vi.fn(),
  getAgentCaseEvents: vi.fn(async () => []),
  getApproverNames: vi.fn(async () => ({})),
  // Luồng SSE im lặng (proxy đệm): không bao giờ trả sự kiện.
  streamAgentCase: vi.fn(() => new Promise(() => undefined)),
}));

describe('CaseTrace khi case đang chạy', () => {
  beforeEach(() => vi.clearAllMocks());

  it('vẫn cập nhật sang trạng thái kết thúc nhờ polling dự phòng khi SSE không có sự kiện', async () => {
    vi.mocked(svc.getAgentCase)
      .mockResolvedValueOnce({ case_id: 'c1', state: 'In Analysis' } as never)
      .mockResolvedValue({ case_id: 'c1', state: 'Needs Info' } as never);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={qc}><CaseTrace caseId="c1" onClose={() => undefined} /></QueryClientProvider>);
    await waitFor(() => expect(screen.getByTestId('case-state').textContent).toContain('Đang phân tích'));
    await waitFor(() => expect(screen.getByTestId('case-state').textContent).not.toContain('Đang phân tích'), { timeout: 6000 });
  }, 10000);
});

describe('CaseTrace: tiêu đề từng agent', () => {
  it('mỗi agent trong kế hoạch có heading h3 với tên đúng vai', async () => {
    vi.mocked(svc.getAgentCase).mockResolvedValue({ case_id: 'c2', state: 'Needs Info' } as never);
    vi.mocked(svc.getAgentCaseEvents).mockResolvedValue([
      { id: 1, ts: 1, type: 'plan_created', agent: 'planner', payload: { tasks: [
        { task_id: 't1', agent: 'credit', objective: 'Phân tích', depends_on: [] },
        { task_id: 't2', agent: 'operations', objective: 'Soạn nháp', depends_on: [] },
      ] } },
    ] as never);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={qc}><CaseTrace caseId="c2" onClose={() => undefined} /></QueryClientProvider>);
    const h = await screen.findByRole('heading', { level: 3, name: 'Credit' });
    expect(h).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Operations' })).toBeInTheDocument();
  });
});
