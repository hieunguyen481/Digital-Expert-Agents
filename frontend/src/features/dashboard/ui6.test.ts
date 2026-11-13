import { describe, expect, it } from 'vitest';
import type { AgentCaseEvent } from '@/services/agentCaseService';
import { DECISION_LABEL, agentName, cleanAiLine, cleanConditionList, collaboration, groupDuplicateFindings, humanizeGate, parseAiText, quoteAfterLabel, sourceLabel } from './agentTrace';
import { GATE_NOTE, limitNote } from './blindRuns';
import { modelName } from '@/utils/glossary';
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
    expect(quoteAfterLabel(undefined as unknown as string, 'Sao kê 6 tháng')).toBe('Sao kê 6 tháng');
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

describe('lần 6, việc 5: văn phong nhỏ', () => {
  it('Validation chỉ một nhãn trạng thái; "dữ liệu chặn" thành "dữ liệu bắt buộc"', () => {
    expect(DECISION_LABEL.need_more_info).toBe('Cần bổ sung');
    const p = parseAiText('Cần bổ sung thiếu dữ liệu chặn: chưa có kết quả tra cứu CIC');
    expect(p.tag).toBe('Cần bổ sung');
    expect(p.lead).toBe('Thiếu dữ liệu bắt buộc');
  });
  it('tên mô hình ghi "GPT-6 Luna, OpenAI" không lồng ngoặc', () => {
    expect(modelName('openai/gpt-6-luna')).not.toMatch(/[()]/);
  });
});

describe('phiên 2: R02, Q04, SP5', () => {
  it('R02: nhãn giới hạn theo số ca và số lần của lượt đang xem', () => {
    expect(limitNote({ per_case: { a: 1, b: 1, c: 1, d: 1, e: 1 }, runs_per_case: 2 })).toContain('(5 ca, 2 lần mỗi ca)');
    expect(limitNote({ per_case: Object.fromEntries([...Array(8).keys()].map((i) => [String(i), 1])), runs_per_case: 3 })).toContain('(8 ca, 3 lần mỗi ca)');
  });
  it('Q04: nhãn cổng viết hoa thành chữ thường như người viết', () => {
    expect(humanizeGate('CẦN BỔ SUNG: thiếu dữ liệu chặn — Chưa có kết quả CIC')).toBe('Cần bổ sung: thiếu dữ liệu chặn — Chưa có kết quả CIC');
    expect(humanizeGate('Kết luận: CẦN BỔ SUNG/ĐIỀU CHỈNH: thiếu hồ sơ')).toBe('Kết luận: cần bổ sung/điều chỉnh: thiếu hồ sơ');
    expect(humanizeGate('Thiếu dữ liệu chặn, Chưa có báo cáo')).toBe('Thiếu dữ liệu chặn, chưa có báo cáo');
    expect(cleanAiLine('CẦN BỔ SUNG: thiếu dữ liệu chặn')).toMatch(/^Cần bổ sung: /);
    expect(parseAiText('CẦN BỔ SUNG: thiếu hồ sơ pháp lý').tag).toBe('Cần bổ sung');
  });
  it('SP5: câu về cổng tất định nói rõ mô hình đơn lẻ không có cổng', () => {
    expect(GATE_NOTE).toMatch(/cổng quyết định tất định/);
    expect(GATE_NOTE).toMatch(/mô hình đơn lẻ không có cổng/);
  });
});
