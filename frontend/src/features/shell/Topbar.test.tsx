import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { Me } from '@/types/me';

const logout = vi.fn();
vi.mock('@/auth/keycloak', () => ({ logout: () => logout() }));
vi.mock('@/services/apiClient', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: { meta: { total: 2 } } }) },
}));

import { Topbar } from './Topbar';

const me = { full_name: 'Nguyễn Văn An', roles: ['credit_officer'] } as Me;

function setup() {
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Topbar me={me} role="qhkh" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Topbar', () => {
  it('hiện tên, vai trò và chấm chuông khi có thông báo chưa đọc', async () => {
    setup();
    expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(screen.getByText('Chuyên viên QHKH')).toBeInTheDocument();
    expect(await screen.findByTestId('bell-dot')).toBeInTheDocument();
    expect(screen.getByLabelText('Tìm kiếm')).toBeEnabled();
  });

  it('đăng xuất', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Tài khoản' }));
    await userEvent.click(await screen.findByText('Đăng xuất'));
    expect(logout).toHaveBeenCalled();
  });
});
