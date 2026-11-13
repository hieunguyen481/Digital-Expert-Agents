import { describe, expect, it } from 'vitest';
import { formatBillion, slaText, statusLabel, STATUS_LABEL, workdaysBetween } from './format';
import type { WorkItem } from './types';

const base = {
  paused: false,
  remaining_workdays: null,
  sla_level: 'ok',
  due_at: null,
} as unknown as WorkItem;
const item = (o: Partial<WorkItem>): WorkItem => ({ ...base, ...o });

describe('formatBillion', () => {
  it('định dạng tỷ', () => {
    expect(formatBillion('80000000000')).toBe('80 tỷ');
    expect(formatBillion('12500000000.00')).toBe('12,5 tỷ');
  });
});

describe('slaText', () => {
  const today = new Date(2026, 10, 6); // thứ Sáu 06/11/2026
  it('tạm dừng', () => {
    expect(slaText(item({ paused: true, sla_level: 'pause' }), today)).toBe('tạm dừng');
  });
  it('hạn hôm nay', () => {
    expect(slaText(item({ sla_level: 'today', due_at: new Date(2026, 10, 6, 17).toISOString() }), today)).toBe('hạn hôm nay');
  });
  it('còn n ngày LV (bỏ cuối tuần)', () => {
    expect(slaText(item({ due_at: new Date(2026, 10, 10, 17).toISOString() }), today)).toBe('còn 2 ngày LV');
  });
  it('quá hạn n ngày LV', () => {
    expect(slaText(item({ sla_level: 'over', due_at: new Date(2026, 10, 4, 17).toISOString() }), today)).toBe('quá hạn 2 ngày LV');
  });
  it('thứ Bảy, hạn thứ Sáu 13/11: ghi ngày hạn, không ghi "quá hạn hôm nay"', () => {
    const sat = new Date(2026, 10, 14, 9);
    expect(slaText(item({ sla_level: 'over', due_at: new Date(2026, 10, 13, 17).toISOString() }), sat)).toBe('quá hạn từ 13/11');
  });
  it('hạn là chính hôm nay nhưng đã qua giờ: vẫn "quá hạn hôm nay"', () => {
    expect(slaText(item({ sla_level: 'over', due_at: new Date(2026, 10, 6, 8).toISOString() }), new Date(2026, 10, 6, 17))).toBe('quá hạn hôm nay');
  });
  it('workdaysBetween', () => {
    expect(workdaysBetween(today, new Date(2026, 10, 9))).toBe(1);
  });
});

describe('nhãn trạng thái', () => {
  it('đủ 14 trạng thái', () => {
    expect(Object.keys(STATUS_LABEL)).toHaveLength(14);
    expect(statusLabel('APPRAISAL_PENDING_INFO')).toBe('Thẩm định – chờ bổ sung');
  });
});

describe('customerLabel', () => {
  it('thay "—" bằng câu rõ nghĩa và nhận ra hồ sơ chưa có khách', async () => {
    const { customerLabel, isNameless } = await import('./format');
    expect(customerLabel('—')).toBe('Chưa có tên khách');
    expect(customerLabel('CTCP A')).toBe('CTCP A');
    expect(isNameless({ customer_name: '' })).toBe(true);
  });
});

import { deadlineClass, withDeadlineClass } from './format';
describe('deadlineClass: một hàm phân loại hạn theo thời điểm hết hạn thật', () => {
  const item = { due_at: '2026-11-13T10:00:00Z', paused: false, sla_level: 'today', status: 'APPRAISAL', tags: [] } as unknown as WorkItem;
  it('trước giờ hết hạn trong cùng ngày là hạn hôm nay, sau giờ là quá hạn', () => {
    expect(deadlineClass(item, new Date('2026-11-13T09:00:00Z'))).toBe('today');
    expect(deadlineClass(item, new Date('2026-11-13T10:30:00Z'))).toBe('over');
    expect(deadlineClass(item, new Date('2026-11-12T09:00:00Z'))).toBe('ok');
  });
  it('chip chữ, thẻ over và KPI cùng một kết quả sau giờ hết hạn', () => {
    const now = new Date('2026-11-13T10:30:00Z');
    expect(slaText(item, now)).toBe('quá hạn hôm nay');
    const d = withDeadlineClass({ ...item, sla_level: 'today' } as WorkItem, now);
    expect(d.sla_level).toBe('over');
    expect(d.tags).toContain('over');
    const before = withDeadlineClass({ ...item, sla_level: 'over', tags: ['over'] } as WorkItem, new Date('2026-11-13T09:00:00Z'));
    expect(before.sla_level).toBe('today');
    expect(before.tags).not.toContain('over');
  });
  it('tạm dừng và không có hạn', () => {
    expect(deadlineClass({ ...item, paused: true }, new Date())).toBe('pause');
    expect(deadlineClass({ ...item, due_at: null }, new Date())).toBe('none');
  });
});

import { unifyStatusNames } from './format';
describe('unifyStatusNames', () => {
  it('lý do chỉ xem của máy chủ dùng đúng tên chip trạng thái', () => {
    expect(unifyStatusNames('Hồ sơ đang ở trạng thái “Đang cho ý kiến rủi ro”, vai trò của bạn')).toBe('Hồ sơ đang ở trạng thái “Chờ ý kiến rủi ro”, vai trò của bạn');
    expect(unifyStatusNames('Đang thẩm định')).toBe('Đang thẩm định');
    expect(unifyStatusNames('')).toBe('');
  });
});
