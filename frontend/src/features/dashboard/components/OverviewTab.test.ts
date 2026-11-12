import { describe, expect, it } from 'vitest';
import { participationNote } from './OverviewTab';

describe('participationNote', () => {
  it('Planner là điều phối, không hiện số 0', () => {
    expect(participationNote({ agent: 'planner', tasks: 0, errors: 0, tool_calls: 0 })).toBe('điều phối');
  });
  it('agent có công cụ hoặc lỗi mà chưa có tác vụ xong thì giải thích thay cho số 0', () => {
    expect(participationNote({ agent: 'document', tasks: 0, errors: 74, tool_calls: 401 })).toBe('chưa có tác vụ hoàn tất');
  });
  it('agent có tác vụ thì hiện số', () => {
    expect(participationNote({ agent: 'credit', tasks: 12, errors: 0, tool_calls: 30 })).toBeNull();
  });
});
