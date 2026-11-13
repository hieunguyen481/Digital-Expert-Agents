import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DeadlineChip } from './DeadlineChip';
import type { WorkItem } from './types';

const base = { status: 'APPRAISAL', due_at: '2026-11-16T00:00:00Z', paused: false, sla_level: 'ok' } as unknown as WorkItem;
const today = new Date('2026-11-13T03:00:00Z');

describe('DeadlineChip', () => {
  it('ẩn khi hồ sơ đã kết thúc', () => {
    const { container } = render(<DeadlineChip item={{ ...base, status: 'APPROVED' }} today={today} />);
    expect(container.textContent).toBe('');
  });
  it('quá hạn hiện chữ quá hạn, còn xa hiện số ngày', () => {
    render(<DeadlineChip item={{ ...base, due_at: '2026-11-10T00:00:00Z', sla_level: 'over' }} today={today} />);
    expect(screen.getByText(/quá hạn/)).toBeTruthy();
  });
});

describe('DeadlineChip trong cùng ngày hết hạn', () => {
  const it0 = { ...base, due_at: '2026-11-13T10:00:00Z', sla_level: 'today' } as unknown as WorkItem;
  it('trước giờ hết hạn: hạn hôm nay; sau giờ: quá hạn (đỏ), không ghi hôm nay', () => {
    const { container, rerender } = render(<DeadlineChip item={it0} today={new Date('2026-11-13T09:00:00Z')} />);
    expect(container.textContent).toBe('hạn hôm nay');
    rerender(<DeadlineChip item={it0} today={new Date('2026-11-13T10:30:00Z')} />);
    expect(container.textContent).toBe('quá hạn hôm nay');
  });
});
