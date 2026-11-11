import { describe, expect, it } from 'vitest';
import { cleanNotificationText, groupNotifications } from './cleanText';

describe('cleanNotificationText', () => {
  it('bỏ mã LA-, hậu tố mẫu và dấu chấm thừa', () => {
    const r = cleanNotificationText('Đề xuất LA-20261111-EAADA6D7 đã được gửi.. (dữ liệu mẫu)');
    expect(r.text).toBe('Đề xuất đã được gửi.');
    expect(r.sample).toBe(true);
  });
});

describe('groupNotifications', () => {
  it('gộp thông báo trùng', () => {
    const base = { title: 'T', message: 'M LA-20261111-EAADA6D7', status: 'UNREAD', resource_id: 'r' };
    const g = groupNotifications([{ ...base, id: '1' }, { ...base, id: '2', status: 'READ' }]);
    expect(g).toHaveLength(1);
    expect(g[0].count).toBe(2);
    expect(g[0].unread).toBe(true);
  });
});
