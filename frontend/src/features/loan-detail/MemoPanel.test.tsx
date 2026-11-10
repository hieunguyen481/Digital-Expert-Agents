import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoPanel } from './MemoPanel';
import type { MemoView } from './types';

const download = vi.fn();
let view: MemoView;
vi.mock('./loanDetailService', () => ({ downloadMemoPdf: (...a: unknown[]) => download(...a) }));
vi.mock('./useMemoAutosave', () => ({
  useMemoAutosave: () => ({ view, loadError: null, state: { kind: 'idle' }, bodies: {}, change: vi.fn(), saveNow: vi.fn(), reload: vi.fn(), decide: vi.fn() }),
}));

const base: MemoView = {
  loan_application_id: 'l', loan_status: 'APPRAISAL', titles: { '1': 'A' }, draft: null, editable: false, progress: null,
  finalized: null, versions: [],
} as unknown as MemoView;

describe('MemoPanel – tải PDF', () => {
  beforeEach(() => download.mockReset());

  it('chưa chốt: nút khóa kèm lý do', () => {
    view = base;
    render(<MemoPanel loanId="l" />);
    expect(screen.getByTestId('memo-pdf')).toBeDisabled();
    expect(screen.getByTestId('memo-pdf-reason').textContent).toContain('chưa được chốt');
  });

  it('đã chốt: bấm nút gọi tải đúng hồ sơ', async () => {
    view = { ...base, finalized: { revision: 2, finalized_at: '2026-11-05T03:30:00Z', finalized_by_name: 'X', sections: {} } };
    render(<MemoPanel loanId="l" />);
    const btn = screen.getByTestId('memo-pdf');
    expect(btn).toBeEnabled();
    expect(btn.textContent).toContain('bản chốt mới nhất');
    fireEvent.click(btn);
    await waitFor(() => expect(download).toHaveBeenCalledWith('l'));
  });
});
