import { describe, expect, it } from 'vitest';
import { kindTitle, proposalChains, proposalDocs, proposalTitle } from './ActionProposals';

const ev = (id: number, type: string, payload: Record<string, unknown>) => ({ id, agent: 'x', type, ts: id, payload });

describe('proposalChains', () => {
  it('xếp chuỗi đề xuất → xác nhận → thực hiện theo từng đề xuất', () => {
    const rows = proposalChains([
      ev(1, 'action_proposed', { proposal_id: 'p1', kind: 'add_risk_flag', title: 'Lệch MST', rationale: 'MST lệch' }),
      ev(2, 'task_finished', {}),
      ev(3, 'action_confirmed', { proposal_id: 'p1', kind: 'add_risk_flag', reason: 'đủ căn cứ' }),
      ev(4, 'action_executed', { proposal_id: 'p1', kind: 'add_risk_flag' }),
      ev(5, 'action_proposed', { proposal_id: 'p2', kind: 'request_documents', title: 'Bổ sung', rationale: 'thiếu' }),
      ev(6, 'action_dismissed', { proposal_id: 'p2', kind: 'request_documents', reason: 'không cần' }),
    ]);
    expect(rows.map((r) => r.steps.map((s) => s.label))).toEqual([
      ['Agent đề xuất', 'Người xác nhận', 'Hệ thống thực hiện'],
      ['Agent đề xuất', 'Người bỏ đề xuất'],
    ]);
  });
  it('lần thực hiện bị từ chối hiện rõ', () => {
    const rows = proposalChains([
      ev(1, 'action_proposed', { proposal_id: 'p1', kind: 'add_risk_flag', title: 't', rationale: 'r' }),
      ev(2, 'action_refused', { proposal_id: 'p1', kind: 'add_risk_flag', message: 'không đủ quyền' }),
    ]);
    expect(rows[0].steps[1]).toMatchObject({ label: 'Hệ thống từ chối', text: 'không đủ quyền' });
  });
});

describe('proposalTitle: thẻ và ngăn kéo cùng một số mục', () => {
  const p = {
    kind: 'request_documents', title: 'Yêu cầu khách bổ sung 5 mục',
    params: { documents: ['Báo cáo tài chính 2025 (§4.1)', 'Báo cáo tài chính 2025 (§4.1)', 'Hợp đồng đầu ra chính', 'Biên bản định giá tài sản', 'Giấy phép kinh doanh'] },
  } as never;
  it('đếm lại theo danh sách đã gộp, cùng một hàm cho cả hai nơi', () => {
    const n = proposalDocs(p).length;
    expect(n).toBe(4); // chỉ bỏ mục trùng y hệt
    expect(proposalTitle(p)).toContain(`${n} mục`);
    expect(proposalTitle(p)).not.toContain('5 mục');
  });
});

describe('proposalDocs: người xác nhận thấy đúng danh sách sẽ gửi', () => {
  const mk = (documents: string[]) => ({ kind: 'request_documents', title: 'x', params: { documents } }) as never;
  it('không gộp mục gần giống, không lọc mục ngắn hay chữ thường', () => {
    const docs = ['Báo cáo tài chính 2025 kiểm toán', 'Báo cáo tài chính 2025 có dấu xác nhận', 'đối chiếu nguồn tiền vào', 'DSCR cần xác minh'];
    expect(proposalDocs(mk(docs))).toHaveLength(4);
  });
  it('bỏ mục trùng y hệt sau chuẩn hóa', () => {
    expect(proposalDocs(mk(['Giấy phép kinh doanh.', 'giấy phép kinh doanh', 'Hợp đồng đầu ra']))).toHaveLength(2);
  });
});

describe('kindTitle: nhãn lặp trong tiêu đề', () => {
  it('bỏ "Bổ sung trước giải ngân:" dưới nhãn Điều kiện trước giải ngân, giữ nội dung', () => {
    expect(kindTitle('add_disbursement_condition', 'Bổ sung trước giải ngân (không cản trở trình): người đại diện pháp luật chưa có trong hồ sơ'))
      .toBe('người đại diện pháp luật chưa có trong hồ sơ');
  });
  it('tiêu đề thường không bị đổi', () => {
    expect(kindTitle('add_disbursement_condition', 'Mở tài khoản thanh toán trước giải ngân')).toBe('Mở tài khoản thanh toán trước giải ngân');
    expect(kindTitle('add_risk_flag', 'Bổ sung trước giải ngân: hồ sơ pháp lý')).toBe('Bổ sung trước giải ngân: hồ sơ pháp lý');
  });
});
