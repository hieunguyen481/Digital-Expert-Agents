import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const get = vi.fn();
vi.mock('@/services/apiClient', () => ({ default: { get: (...a: unknown[]) => get(...a) } }));

import { useWorkItems } from './useWorkItems';

describe('useWorkItems', () => {
  it('gọi /work-items với đúng filter', async () => {
    get.mockResolvedValue({ data: { badge: 4, facts: {}, items: [] } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useWorkItems('bosung'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(get).toHaveBeenCalledWith('/work-items', { params: { filter: 'bosung' } });
    expect(result.current.data?.badge).toBe(4);
  });
});
