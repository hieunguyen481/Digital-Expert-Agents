import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { WelcomeState } from './WelcomeState';
import { quickPromptsFor } from '@/features/chat/constants/quickPrompts';

function renderWelcome() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <WelcomeState onSelectPrompt={vi.fn()} staffName="Nguyễn Văn Thẩm Định" />
    </QueryClientProvider>,
  );
}

describe('WelcomeState – L13', () => {
  it('lời chào hiện đủ họ tên', () => {
    renderWelcome();
    expect(screen.getByText('Nguyễn Văn Thẩm Định')).toBeTruthy();
  });

  it('gợi ý 3–4 câu hỏi, không chứa mã hồ sơ hay tên khách dựng sẵn', () => {
    renderWelcome();
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(3);
    for (const role of ['qhkh', 'tdinh', 'pheduyet', 'ruiro', 'kiemtoan'] as const) {
      const list = quickPromptsFor(role);
      expect(list.length).toBeGreaterThanOrEqual(3);
      expect(list.length).toBeLessThanOrEqual(4);
      for (const p of list) expect(p.prompt).not.toMatch(/HS-|CIF-|Minh Phát|Hồng Nhung/);
    }
  });
});
