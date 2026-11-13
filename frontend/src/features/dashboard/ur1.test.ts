import { describe, expect, it } from 'vitest';
import { cleanAiLine, cleanConditionList, dropZeroStatus, parseAiText, scrubInternal } from './agentTrace';

describe('việc 1: câu "0 đồng" là nhận xét, không phải điều kiện', () => {
  const A = 'Giá trị TSĐB đủ điều kiện hiện tại bằng 0 đồng do định giá chưa xác minh';
  const B = 'Hạn mức có bảo đảm đủ điều kiện là 0 đồng';
  it('câu cần sửa: loại khỏi danh sách điều kiện', () => {
    expect(cleanConditionList([A, 'Bổ sung chứng thư định giá TSĐB'])).toEqual(['Bổ sung chứng thư định giá TSĐB']);
    expect(cleanConditionList([B])).toEqual([]);
  });
  it('câu cần sửa: dòng ngắn bỏ mệnh đề 0 đồng', () => {
    expect(cleanAiLine(`Điều kiện bổ sung: ${A}`)).not.toMatch(/0 đồng/);
    expect(cleanAiLine(`Tổng hợp; ${B}`)).not.toMatch(/0 đồng/);
    expect(dropZeroStatus(B, true)).toBe('');
  });
  it('câu bình thường không bị hỏng', () => {
    expect(cleanAiLine('Dư nợ hiện hữu tại ngân hàng là 0 đồng')).toBe('Dư nợ hiện hữu tại ngân hàng là 0 đồng');
    expect(cleanConditionList(['Bổ sung chứng thư định giá TSĐB do định giá chưa xác minh'])).toHaveLength(1);
    expect(cleanConditionList(['Giá trị TSĐB bằng 120 tỷ đồng cần xác minh bằng chứng thư'])).toHaveLength(1);
    expect(parseAiText('Dư nợ hiện tại 0 đồng và không có nợ xấu').items[0]).toContain('0 đồng');
  });
});

describe('việc 2: "(không cản trở trình)"', () => {
  it('bỏ cụm', () => {
    expect(scrubInternal('Bổ sung trước giải ngân (không chặn trình): người đại diện')).toBe('Bổ sung trước giải ngân: người đại diện');
    expect(scrubInternal('Hoàn tất hồ sơ (không cản trở trình hồ sơ)')).toBe('Hoàn tất hồ sơ');
  });
  it('không đụng câu thường có chữ "không chặn"', () => {
    expect(scrubInternal('Hệ thống không chặn giải ngân')).toBe('Hệ thống không cản trở giải ngân');
  });
});

describe('việc 4: inflow và số tròn', () => {
  it('inflow thành tiền về tài khoản', () => {
    expect(scrubInternal('Đối chiếu inflow theo kỳ với doanh thu BCTC')).toBe('Đối chiếu tiền về tài khoản theo kỳ với doanh thu BCTC');
    expect(scrubInternal('Inflow 12 tháng lớn hơn doanh thu')).toMatch(/^Tiền về tài khoản 12 tháng/);
    expect(scrubInternal('công cụ get_annual_inflow')).not.toMatch(/tiền về tài khoản tiền/);
  });
  it('80,0 tỷ thành 80 tỷ đồng, số lẻ và cụm khác giữ nguyên', () => {
    expect(scrubInternal('đề xuất 80,0 tỷ = 80,0 tỷ')).toBe('đề xuất 80 tỷ đồng = 80 tỷ đồng');
    expect(scrubInternal('145.0 tỷ giá khai')).toBe('145 tỷ đồng giá khai');
    expect(scrubInternal('LTV 1,5 tỷ đồng và 2 tỷ VND')).toBe('LTV 1,5 tỷ đồng và 2 tỷ VND');
    expect(scrubInternal('tỷ lệ 55,2%, tỷ giá tăng')).toBe('tỷ lệ 55,2%, tỷ giá tăng');
    expect(scrubInternal('56,5 tỷ')).toBe('56,5 tỷ đồng');
  });
  it('dấu chấm dính dấu lửng', () => {
    expect(scrubInternal('Kiểm tra dữ liệu doanh nghiệp.…')).toBe('Kiểm tra dữ liệu doanh nghiệp…');
  });
});
