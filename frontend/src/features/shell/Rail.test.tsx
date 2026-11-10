import { cleanup, render, screen } from '@testing-library/react';
import { message } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
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
  // Toast và tooltip antd còn hẹn giờ/raf sau khi test xong; dọn trước khi jsdom bị đóng để khỏi lỗi 'window is not defined'.
  afterEach(() => {
    message.destroy();
    cleanup();
  });

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

  it('Quản trị không có mục Nhật ký (không có quyền đọc, Q-J)', () => {
    expect(RAIL_ITEMS.quantri.map((i) => i.label)).not.toContain('Nhật ký kiểm toán');
  });

  it('Nhật ký kiểm toán và Tra cứu chính sách có trang thật', () => {
    expect(RAIL_ITEMS.kiemtoan.find((i) => i.label === 'Nhật ký kiểm toán')?.path).toBe('/nhat-ky-kiem-toan');
    expect(RAIL_ITEMS.qhkh.find((i) => i.label === 'Tra cứu chính sách')?.path).toBe('/tra-cuu-chinh-sach');
  });

  it('mục chưa có trang hiện toast "sẽ có ở đợt sau" (D1)', async () => {
    labelsFor('qhkh');
    await userEvent.click(screen.getByRole('button', { name: 'Khách hàng SME' }));
    expect(await screen.findByText('Khách hàng SME: sẽ có ở đợt sau')).toBeInTheDocument();
  });
});
