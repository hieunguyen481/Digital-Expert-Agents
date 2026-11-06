import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RequireRole } from './RequireRole';

const useMe = vi.fn();
vi.mock('./session', () => ({ useMe: () => useMe() }));

function renderGate(allow: Parameters<typeof RequireRole>[0]['allow']) {
  return render(
    <MemoryRouter>
      <RequireRole allow={allow}>
        <div>nội dung trang</div>
      </RequireRole>
    </MemoryRouter>,
  );
}

describe('RequireRole', () => {
  beforeEach(() => useMe.mockReset());

  it('cho phép vai trò trong danh sách', () => {
    useMe.mockReturnValue({ data: { roles: ['credit_officer'] } });
    renderGate(['qhkh']);
    expect(screen.getByText('nội dung trang')).toBeInTheDocument();
  });

  it('chặn vai trò ngoài danh sách bằng NoAccess', () => {
    useMe.mockReturnValue({ data: { roles: ['admin'] } });
    renderGate(['qhkh']);
    expect(screen.queryByText('nội dung trang')).not.toBeInTheDocument();
    expect(screen.getByText('Không có quyền xem nội dung nghiệp vụ')).toBeInTheDocument();
  });

  it('không có vai trò khớp thì NoAccess', () => {
    useMe.mockReturnValue({ data: { roles: [] } });
    renderGate(['qhkh']);
    expect(screen.getByText('Không có quyền xem trang này')).toBeInTheDocument();
  });

  it('đang tải thì skeleton, không lộ nội dung', () => {
    useMe.mockReturnValue({ data: undefined, isError: false });
    renderGate(['qhkh']);
    expect(screen.queryByText('nội dung trang')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
