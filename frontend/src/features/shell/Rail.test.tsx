import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { UiRole } from '@/auth/roleFromMe';
import { RAIL_ITEMS } from './navigation';
import { Rail } from './Rail';

const ROLES = Object.keys(RAIL_ITEMS) as UiRole[];

function labelsFor(role: UiRole, badge?: number) {
  render(
    <MemoryRouter>
      <Rail role={role} badge={badge} onOpenAi={() => {}} />
    </MemoryRouter>,
  );
  return screen.queryAllByRole('link').concat(screen.queryAllByRole('button')).map((e) => e.getAttribute('aria-label'));
}

describe('Rail', () => {
  it.each(ROLES)('mục rail đúng bảng §2.1 cho %s', (role) => {
    const labels = labelsFor(role);
    for (const entry of RAIL_ITEMS[role]) expect(labels).toContain(entry.label);
  });

  it('quản trị không có Trợ lý AI; vai trò khác có', () => {
    expect(RAIL_ITEMS.quantri.some((i) => i.label === 'Trợ lý AI')).toBe(false);
    for (const r of ROLES.filter((x) => x !== 'quantri')) {
      expect(RAIL_ITEMS[r].at(-1)?.label).toBe('Trợ lý AI');
    }
  });

  it('badge chỉ ở mục đầu', () => {
    labelsFor('tdinh', 3);
    const badges = screen.getAllByTestId('rail-badge');
    expect(badges).toHaveLength(1);
    expect(badges[0]).toHaveTextContent('3');
    expect(badges[0].parentElement).toHaveAttribute('aria-label', 'Việc của tôi');
  });

  it('không có badge khi 0', () => {
    labelsFor('tdinh', 0);
    expect(screen.queryByTestId('rail-badge')).toBeNull();
  });
});
