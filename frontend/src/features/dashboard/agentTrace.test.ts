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

describe('sourceLabel (L07)', () => {
  it('hiện tên nguồn nghiệp vụ, không lộ tên bảng/tệp', async () => {
    const { sourceLabel } = await import('./agentTrace');
    for (const raw of ['customer.kyc_assessment', 'so_tinh_lai', 'compliance_policy', 'compliance_policy.md',
      'credit.loan_account + credit.customer_exposure', 'core-banking:get_collateral', 'banking.unknown_table']) {
      expect(sourceLabel(raw)).not.toMatch(/[a-z]+_[a-z]+|\.md|core-banking|^[a-z]+\.[a-z_]+$/);
    }
    expect(sourceLabel('CS-TD-SME/2025 §3.1')).toBe('CS-TD-SME/2025 §3.1');
  });
});

describe('parseAiText và dedupeConditions', () => {
  it('hạ nhãn chữ hoa, tách ý, bỏ "— " đầu, đổi mã kỹ thuật', async () => {
    const { parseAiText } = await import('./agentTrace');
    const r = parseAiText('CẦN BỔ SUNG: thiếu dữ liệu chặn — Chưa có CIC — phải tra cứu trước khi trình (CS-TD-SME/2025 §6.1); Chưa có AML (công cụ tra; compliance_policy Điều 6)');
    expect(r.tag).toBe('Cần bổ sung');
    expect(r.lead).toBe('Thiếu dữ liệu chặn');
    expect(r.items).toEqual(['Chưa có CIC, phải tra cứu trước khi trình (CS-TD-SME/2025 §6.1)', 'Chưa có AML (công cụ tra; Chính sách tuân thủ Điều 6)']);
    expect(parseAiText('— Phần còn thiếu BCTC AI_OCR').items).toEqual(['Phần còn thiếu BCTC AI trích xuất']);
  });
  it('câu thật của 00187/00163: chỉ tách ý độc lập, không có mục chữ thường, "vs" hay "— "', async () => {
    const { parseAiText } = await import('./agentTrace');
    const real = [
      'Phần còn thiếu không chặn việc áp dụng chính sách, xử lý như điều kiện trước giải ngân: KYB, blacklist và CIC không cho thấy điểm dừng; chưa thể chấp thuận khoản vay có bảo đảm vì định giá TSĐB đang chờ xác minh.',
      'Chấp thuận có điều kiện hạn mức 10 tỷ đồng; hoàn tất các điều kiện trước giải ngân.',
      'Chưa thể kết luận cấp khoản vay có bảo đảm: dư nợ giữa các dữ liệu không khớp và tài sản chưa hoàn tất xác minh định giá. Hạn mức bảo đảm hiện tính được: 0 đồng.',
      'Cần đối soát dư nợ hiện hữu do số liệu mâu thuẫn; chưa ghi nhận TSĐB đủ điều kiện.',
      'KYB, blacklist, CIC và TSĐB đạt ngưỡng đã kiểm tra; cần bổ sung bằng chứng BCTC kiểm toán vì tổng dư nợ sau cấp vượt 20 tỷ.',
      'Dư nợ 12 tỷ vs 9 tỷ trong CIC — chênh lệch cần đối soát',
    ];
    for (const t of real) {
      const r = parseAiText(t);
      for (const it of r.items) { expect(it).toMatch(/^\p{Lu}|^\d/u); expect(it).not.toMatch(/ vs |— /); }
    }
    expect(parseAiText(real[1]).items).toHaveLength(1);
    expect(parseAiText(real[2]).items.join(' ')).not.toMatch(/hiện tính được/);
    expect(parseAiText(real[5]).items[0]).toContain('so với');
    expect(parseAiText(real[3]).items).toHaveLength(1);
    const n = parseAiText('Cần bổ sung thiếu dữ liệu chặn: Chưa có kết quả CIC cho khách hàng này; Chưa có kết quả sàng lọc AML của khách hàng');
    expect(n.tag).toBe('Cần bổ sung');
    expect(n.lead).toBe('Thiếu dữ liệu chặn');
    expect(n.items).toHaveLength(2);
  });
  it('câu kết luận dự phòng cho lượt Cần bổ sung', async () => {
    const { fallbackConclusion } = await import('./agentTrace');
    const v = (decision: string, summary: string) => ({ agent: 'x', decision, summary });
    const out = fallbackConclusion('Needs Info', [
      v('pass', 'Điều kiện vận hành đạt.'),
      v('need_more_info', 'Chưa có kết quả CIC cho khách hàng này; cần tra cứu'),
      v('need_more_info', 'Chưa có BCTC kiểm toán bắt buộc vì tổng dư nợ vượt 20 tỷ'),
      v('need_more_info', 'Chưa có kết quả sàng lọc AML của khách hàng'),
      v('need_more_info', 'Thông tin thứ tư không nên hiện ra'),
    ]);
    expect(out).toMatch(/^AI đề xuất: cần bổ sung trước khi quyết định: /);
    expect((out ?? '').split('; ')).toHaveLength(3);
    expect(fallbackConclusion('Completed', [])).toBeNull();
  });
  it('gộp điều kiện trùng', async () => {
    const { dedupeConditions } = await import('./agentTrace');
    const out = dedupeConditions([
      'Phải có BCTC kiểm toán trước khi trình (CS-TD-SME/2025 §4.1, §6.1)',
      'Điều kiện tiên quyết: BCTC kiểm toán bắt buộc (CS-TD-SME/2025 §4.1, §6.1)',
      'Bổ sung thông tin người đại diện',
    ]);
    expect(out).toHaveLength(2);
  });
});
