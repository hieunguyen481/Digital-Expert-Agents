import { describe, expect, it } from 'vitest';
import { cleanConditionList, parseAiText, quoteAfterLabel, recountTitle, sameAiText, scrubInternal } from './agentTrace';

const GATE = 'CẦN BỔ SUNG: thiếu dữ liệu chặn — Chưa có kết quả tra cứu CIC — phải tra cứu trước khi trình (CS-TD-SME/2025 §6.1, §6.3); Chưa có kết quả sàng lọc AML/trừng phạt — phải hoàn tất trước khi trình (tra cứu danh sách đen/trừng phạt; chính sách tuân thủ)';

describe('lần 7, việc 1 và 2: chữ AI theo loại', () => {
  it('chuỗi cổng thô thành nhãn, mệnh đề dẫn và gạch đầu dòng, không còn "chặn"', () => {
    const p = parseAiText(GATE);
    expect(p.tag).toBe('Cần bổ sung');
    expect(p.lead).toBe('Thiếu dữ liệu bắt buộc');
    expect(p.items[0]).toMatch(/^Chưa có kết quả tra cứu CIC/);
    expect(JSON.stringify(p)).not.toMatch(/chặn|CẦN BỔ SUNG/);
  });
  it('"Thiếu dữ liệu chặn:" ở danh sách việc thành "Thiếu dữ liệu bắt buộc:"', () => {
    expect(scrubInternal('Thiếu dữ liệu chặn: Chưa có kết quả tra cứu CIC')).toBe('Thiếu dữ liệu bắt buộc: Chưa có kết quả tra cứu CIC');
    expect(scrubInternal('doanh nghiệp chưa có tài khoản thanh toán (không chặn trình hồ sơ)')).toBe('doanh nghiệp chưa có tài khoản thanh toán (không cản trở trình hồ sơ)');
  });
  it('tên agent viết hoa ở mọi vị trí; challenge thành phản biện', () => {
    expect(scrubInternal('Credit và compliance thẩm định song song, validation kiểm chứng, planner điều phối')).toBe('Credit và Compliance thẩm định song song, Validation kiểm chứng, Planner điều phối');
    expect(scrubInternal('điều phối challenge nếu có mâu thuẫn')).toBe('điều phối phản biện nếu có mâu thuẫn');
    expect(scrubInternal('document.extracted_field')).not.toMatch(/^Document/);
  });
  it('"0,0 tỷ" và "0 tỷ đồng" thành "0 đồng"', () => {
    expect(scrubInternal('dư nợ hiện hữu tại ngân hàng 0,0 tỷ + đề xuất 55,0 tỷ = 55,0 tỷ')).toBe('dư nợ hiện hữu tại ngân hàng 0 đồng + đề xuất 55,0 tỷ = 55,0 tỷ');
    expect(scrubInternal('Dư nợ hiện hữu 0 tỷ cộng đề xuất 55 tỷ')).toBe('Dư nợ hiện hữu 0 đồng cộng đề xuất 55 tỷ');
    expect(scrubInternal('dư nợ 10,5 tỷ và 100 tỷ')).toBe('dư nợ 10,5 tỷ và 100 tỷ');
  });
  it('câu điều kiện tiên quyết không lặp cụm "trước khi trình cấp phê duyệt"', () => {
    expect(scrubInternal('Điều kiện tiên quyết trước khi trình cấp phê duyệt: Phải có BCTC kiểm toán trước khi trình cấp phê duyệt (CS-TD-SME/2025 §4.1, §6.1)'))
      .toBe('Điều kiện tiên quyết: Phải có BCTC kiểm toán trước khi trình cấp phê duyệt (CS-TD-SME/2025 §4.1, §6.1)');
    expect(scrubInternal('Điều kiện tiên quyết trước khi trình cấp phê duyệt: Bổ sung BCTC')).toBe('Điều kiện tiên quyết trước khi trình cấp phê duyệt: Bổ sung BCTC');
  });
  it('trích nguồn lặp nhãn khi nhãn ghi " – " còn trích ghi ", "', () => {
    const label = 'CS-TD-SME/2025 §3.1 – Thẩm quyền phê duyệt';
    const quote = 'CS-TD-SME/2025 §3.1, Thẩm quyền phê duyệt Theo tổng cấp tín dụng của khách: ≤ 20 / 20–100 / > 100 tỷ, trang 3';
    expect(quoteAfterLabel(label, quote)).toBe('Theo tổng cấp tín dụng của khách: ≤ 20 / 20–100 / > 100 tỷ, trang 3');
    expect(quoteAfterLabel(label, 'Nội dung khác')).toBe('Nội dung khác');
    expect(quoteAfterLabel('', quote)).toContain('Theo tổng cấp');
  });
  it('yêu cầu khách bổ sung: ghép mục chữ thường, bỏ mục tình trạng chỉ số, gộp mục trùng, đếm lại', () => {
    const docs = [
      'Đối chiếu nghĩa vụ trả nợ, làm rõ cảnh báo DSCR và cung cấp lịch trả nợ khoản vay mới',
      'Bổ sung hồ sơ pháp lý, kết quả định giá TSĐB để xác định LTV',
      'đối chiếu nguồn tiền vào với doanh thu BCTC',
      'Phải có BCTC kiểm toán trước khi trình cấp phê duyệt (CS-TD-SME/2025 §4.1, §6.1)',
      'DSCR cần xác minh và chưa đối chiếu được LTV',
      'Hoàn tất xác minh chứng thư định giá và giá trị TSĐB trước khi xác định lại hạn mức bảo đảm',
      'Cần hoàn thiện xác minh định giá trước khi xem xét tiếp',
    ];
    const out = cleanConditionList(docs);
    expect(out).toHaveLength(4);
    expect(out[1]).toBe('Bổ sung hồ sơ pháp lý, kết quả định giá TSĐB để xác định LTV; đối chiếu nguồn tiền vào với doanh thu BCTC');
    expect(out.some((x) => /^DSCR cần xác minh/.test(x))).toBe(false);
    expect(out.every((x) => /^\p{Lu}/u.test(x))).toBe(true);
    expect(recountTitle('Yêu cầu khách bổ sung 7 mục', out.length)).toBe('Yêu cầu khách bổ sung 4 mục');
  });
  it('chịu được undefined, chuỗi rỗng và phần tử không phải chuỗi', () => {
    expect(cleanConditionList(undefined)).toEqual([]);
    expect(cleanConditionList(['', '  ', null, 5, { text: 'Bổ sung sao kê 12 tháng' }, { x: 1 }] as unknown[])).toEqual(['Bổ sung sao kê 12 tháng']);
    expect(parseAiText(undefined as unknown as string).items).toEqual([]);
    expect(sameAiText(undefined as unknown as string, '')).toBe(false);
    expect(quoteAfterLabel('Nhãn nguồn', undefined as unknown as string)).toBe('');
  });
  it('diễn giải trùng dòng Validation → Planner nhận ra là cùng nội dung', () => {
    expect(sameAiText(GATE, GATE.replace('CẦN BỔ SUNG', 'Cần bổ sung'))).toBe(true);
    expect(sameAiText(GATE, 'Khác hẳn')).toBe(false);
  });
});

describe('phạm vi dư nợ', () => {
  it('"Không có dư nợ" ghi rõ tại ngân hàng, không lặp khi đã có', async () => {
    const { scrubInternal } = await import('./agentTrace');
    expect(scrubInternal('Rà soát nhóm khách hàng liên quan: Không có dư nợ')).toContain('Không có dư nợ tại ngân hàng');
    expect(scrubInternal('Không có dư nợ tại ngân hàng')).toBe('Không có dư nợ tại ngân hàng');
    expect(scrubInternal('')).toBe('');
  });
});

describe('S05 số thập phân và Q04 nhãn cổng chữ hoa', () => {
  it('số thập phân dấu chấm hiện kiểu Việt Nam, mã điều khoản/ngày/mã hồ sơ giữ nguyên', async () => {
    const { decimalVi, scrubInternal } = await import('./agentTrace');
    expect(decimalVi('DSCR = 1.34, ngưỡng 1.25, tối đa 3.5')).toBe('DSCR = 1,34, ngưỡng 1,25, tối đa 3,5');
    expect(decimalVi('Theo §3.1 và Điều 3.1, ngày 12.03.2026, HSV-2026-00187, 45.000.000 đồng, 1.250 đồng')).toBe('Theo §3.1 và Điều 3.1, ngày 12.03.2026, HSV-2026-00187, 45.000.000 đồng, 1.250 đồng');
    expect(decimalVi('')).toBe('');
    expect(scrubInternal('DSCR 1.34 đạt')).toBe('DSCR 1,34 đạt');
  });
  it('nhãn cổng chữ hoa không dấu hai chấm hạ về chữ câu', async () => {
    const { humanizeGate } = await import('./agentTrace');
    expect(humanizeGate('ĐỀ XUẤT PHÊ DUYỆT với điều kiện tiên quyết')).toBe('Đề xuất phê duyệt với điều kiện tiên quyết');
    expect(humanizeGate('Thiếu dữ liệu bắt buộc, Chưa có hồ sơ')).toBe('Thiếu dữ liệu bắt buộc, chưa có hồ sơ');
    expect(humanizeGate('DSCR đạt, LTV đạt')).toBe('DSCR đạt, LTV đạt');
  });
});
