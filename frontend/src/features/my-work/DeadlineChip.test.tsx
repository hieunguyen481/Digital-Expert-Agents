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
