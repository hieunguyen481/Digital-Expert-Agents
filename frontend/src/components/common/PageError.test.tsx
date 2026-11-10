import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PageError } from './PageError';

const wrap = (e: unknown) => render(<MemoryRouter><PageError title="Không tải được hồ sơ" error={e} onRetry={() => undefined} /></MemoryRouter>);

describe('PageError', () => {
  it('403 và 404: không có nút Thử lại, có lối về Việc của tôi', () => {
    for (const status of [403, 404]) {
      const { unmount } = wrap({ code: 'X', message: 'x', status });
      expect(screen.queryByRole('button', { name: /Thử lại/ })).toBeNull();
      expect(screen.getByRole('link', { name: 'Về Việc của tôi' })).toBeTruthy();
      unmount();
    }
  });
  it('5xx: có nút Thử lại', () => {
    wrap({ code: 'X', message: 'x', status: 500 });
    expect(screen.getByRole('button', { name: /Thử lại/ })).toBeTruthy();
  });
});
