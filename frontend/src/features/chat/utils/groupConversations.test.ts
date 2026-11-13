import { describe, expect, it } from 'vitest';
import { conversationStamp, duplicateTitleSet } from './groupConversations';

describe('dòng phân biệt cuộc trò chuyện trùng tên (lần 6, việc 9)', () => {
  it('chỉ đánh dấu tiêu đề xuất hiện từ hai lần', () => {
    expect([...duplicateTitleSet([{ title: 'A' }, { title: 'A' }, { title: 'B' }])]).toEqual(['A']);
  });
  it('dòng giờ có dạng "Cập nhật HH:mm dd/MM"', () => {
    expect(conversationStamp('2026-05-04T08:09:00')).toBe('Cập nhật 08:09 04/05');
    expect(conversationStamp('hỏng')).toBe('');
  });
});
