import { describe, expect, it } from 'vitest';
import type { AgentCaseEvent } from '@/services/agentCaseService';
import { agentName, cleanAiLine, cleanConditionList, collaboration, groupDuplicateFindings, parseAiText, quoteAfterLabel, sourceLabel } from './agentTrace';
import { sourceTypeLabel } from '@/features/loan-detail/format';

const ev = (id: number, agent: string, type: string, payload: Record<string, unknown>) =>
  ({ id, agent, type, payload, case_id: 'c', ts: 0 }) as unknown as AgentCaseEvent;

describe('lần 6, việc 3: làm sạch chữ AI theo loại', () => {
  it('bỏ ý chỉ nêu số hiện trạng và mảnh câu không có đối tượng', () => {
    const out = cleanConditionList([
      'Hạn mức bảo đảm đủ điều kiện hiện tại: 0 đồng',
      'Hoàn thiện, đối chiếu trước khi quyết định',
      'Bổ sung báo cáo tài chính kiểm toán năm gần nhất',
    ]);
    expect(out).toEqual(['Bổ sung báo cáo tài chính kiểm toán năm gần nhất']);
  });
  it('cắt mệnh đề số hiện trạng ở cuối phát hiện', () => {
    const p = parseAiText('Chưa đủ căn cứ kết luận đủ điều kiện do chưa tra cứu CIC; hạn mức có bảo đảm hiện tại là 0 đồng');
    expect(p.items.join(' ')).not.toMatch(/0 đồng/);
  });
  it('gộp phát hiện trùng của hai agent, giữ một', () => {
    const s = 'Phần còn thiếu không chặn việc áp dụng chính sách, được xử lý thành điều kiện trước giải ngân theo chính sách tín dụng';
    const g = groupDuplicateFindings([{ agent: 'credit', summary: s }, { agent: 'compliance', summary: s + '.' }, { agent: 'operations', summary: 'Điều kiện vận hành đạt, đã soạn bản nháp' }]);
    expect(g.map((x) => x.agents)).toEqual([['credit', 'compliance'], ['operations']]);
  });
  it('trích nguồn: ")., trang" thành "), trang" và "..." thành "…"', () => {
    expect(cleanAiLine('Tỷ lệ cho vay (≤ 70%)., trang 9')).toBe('Tỷ lệ cho vay (≤ 70%), trang 9');
    expect(cleanAiLine('có tên trong danh sách đen... từ chối')).toBe('có tên trong danh sách đen… từ chối');
  });
  it('trích nguồn bắt đầu bằng chính nhãn thì bỏ phần lặp', () => {
    const label = 'CS-TD-SME/2025 §1.2, Phạm vi SME';
    expect(quoteAfterLabel(label, `${label}: Chính sách áp dụng cho doanh nghiệp vừa và nhỏ`)).toBe('Chính sách áp dụng cho doanh nghiệp vừa và nhỏ');
    expect(quoteAfterLabel(label, `${label}…`)).toBe('');
    expect(quoteAfterLabel(label, 'Nội dung khác hẳn')).toBe('Nội dung khác hẳn');
  });
  it('nhãn Validation không ghép lặp tên agent', () => {
    expect(sourceLabel('validation')).toBe('Kiểm chứng');
    expect(`${agentName('validation')} · ${sourceLabel('validation')}`).toBe('Validation · Kiểm chứng');
  });
});

describe('lần 6, việc 6 và 2', () => {
  it('chiều trả kết quả đi về Planner (điều phối)', () => {
    const f = collaboration([ev(1, 'operations', 'task_finished', { verdict: { summary: 'ok' } })]);
    expect(agentName(f[0].to)).toBe('Planner (điều phối)');
  });
  it('loại nguồn AI_OCR có nhãn, mã lạ rơi về chữ thường', () => {
    expect(sourceTypeLabel('AI_OCR')).toBe('AI trích xuất');
    expect(sourceTypeLabel('SOME_NEW_KIND')).toBe('Some new kind');
  });
});
