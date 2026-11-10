import { describe, expect, it } from 'vitest';
import type { AgentCaseEvent } from '@/services/agentCaseService';
import { decisions, realActions, sharedBoards, toolCalls, validationView } from './agentTrace';

const ev = (id: number, agent: string, type: string, payload: Record<string, unknown>) =>
  ({ id, agent, type, payload, case_id: 'c', ts: 0 }) as unknown as AgentCaseEvent;

describe('agentTrace: dữ liệu cho trace đội agent', () => {
  it('phân biệt công cụ agent tự gọi và hệ thống gọi bù', () => {
    const calls = toolCalls([
      ev(1, 'credit', 'tool_call', { tool: 'get_financials', outcome: 'ok', duration_ms: 5, initiated_by: 'agent' }),
      ev(2, 'credit', 'tool_call', { tool: 'get_annual_inflow', outcome: 'ok', duration_ms: 7, initiated_by: 'system_compensation' }),
    ]);
    expect(calls.map((c) => c.initiatedBy)).toEqual(['agent', 'system_compensation']);
  });

  it('bảng chung: khóa agent gọi và khóa gọi bù', () => {
    const b = sharedBoards([ev(3, 'credit', 'shared_board_updated', {
      scope: 'credit', called_by_agent: ['financials'], compensated: ['inflow'], board_keys: ['financials', 'inflow'] })]);
    expect(b[0]).toMatchObject({ scope: 'credit', called: ['financials'], compensated: ['inflow'] });
  });

  it('Validation: số tính lại, vấn đề, diễn giải AI, phản biện', () => {
    const v = validationView([
      ev(4, 'validation', 'a2a_challenge', { to: 'credit' }),
      ev(5, 'credit', 'challenge_handled', {}),
      ev(6, 'validation', 'task_finished', { verdict: { data: {
        verified: { lines: ['LTV 102.6%'] }, issues: ['vượt LTV'], narrative: 'Cần bổ sung' } } }),
    ]);
    expect(v).toMatchObject({ lines: ['LTV 102.6%'], issues: ['vượt LTV'], narrative: 'Cần bổ sung', challenges: 1, handled: 1 });
    expect(validationView([])).toBeNull();
  });

  it('quyết định trên hồ sơ và hành động thật', () => {
    const events = [
      ev(7, 'hitl', 'decided_on_loan', { approver: 'u1' }),
      ev(8, 'orchestrator', 'state_changed', { state: 'Completed', workflow_status: 'APPROVED' }),
      ev(9, 'orchestrator', 'state_changed', { state: 'In Analysis' }),
    ];
    expect(decisions(events)[0].label).toContain('quyết định trên hồ sơ');
    expect(realActions(events)).toEqual([{ id: 8, workflowStatus: 'APPROVED', state: 'Completed' }]);
  });
});

describe('scrubInternal', () => {
  it('che UUID và tên trường kỹ thuật', async () => {
    const { scrubInternal } = await import('./agentTrace');
    const out = scrubInternal('Xét industry_risk và collateral_id 77100000-0000-4000-8000-000000000001 của hồ sơ; mã 12345678-1234-1234-1234-123456789abc');
    expect(out).toBe('Xét rủi ro ngành và tài sản bảo đảm của hồ sơ; mã (mã nội bộ)');
  });
});
