import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { NoAccess } from './NoAccess';

const renderIt = (role: Parameters<typeof NoAccess>[0]['role']) =>
  render(
    <MemoryRouter>
      <NoAccess role={role} />
    </MemoryRouter>,
  );

describe('NoAccess', () => {
  it('đúng một nút, không tên khách', () => {
    renderIt('tdinh');
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /Về Việc của tôi/ })).toBeInTheDocument();
    expect(screen.getByRole('alert').textContent).not.toMatch(/Công ty|TNHH|Cổ phần/i);
  });

  it('quản trị: nút Mở Quản trị mở trang Quản trị', () => {
    renderIt('quantri');
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toBeEnabled();
  });

  it('không có nhãn tên trang mồ côi phía trên tiêu đề', () => {
    const { container } = render(
      <MemoryRouter>
        <NoAccess role="quantri" pageName="Việc của tôi" />
      </MemoryRouter>,
    );
    expect(container.querySelector('p')?.textContent ?? '').not.toBe('Việc của tôi');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Không có quyền/);
  });
});
