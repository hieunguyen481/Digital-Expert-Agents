import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DecisionModal } from './DecisionModal';
import type { CaseActionState } from './types';

const state = { version: 2, pending_exceptions: [], blockers: [], opinions: [] } as unknown as CaseActionState;
const mount = (onSubmit = vi.fn()) => render(
  <DecisionModal open loanId="L" applicationNumber="HSV-1" requestedAmount={24e9} requestedTerm={12} state={state} busy={false} error={null} onCancel={() => {}} onSubmit={onSubmit} />,
);

describe('DecisionModal (mockup 12b)', () => {
  it('có 4 thẻ lựa chọn có mô tả, hạn mức có nhãn và đơn vị', () => {
    mount();
    expect(screen.getAllByRole('radio').length).toBeGreaterThanOrEqual(4);
    for (const t of ['Phê duyệt', 'Phê duyệt có điều kiện', 'Từ chối', 'Trả lại']) expect(screen.getByText(t, { selector: 'b' })).toBeTruthy();
    expect(screen.getByLabelText(/Hạn mức phê duyệt/)).toBeTruthy();
    expect(screen.getByLabelText(/Lý do quyết định/)).toBeTruthy();
  });
  it('nút Ghi quyết định chỉ mở bước xác nhận "Không hoàn tác được", chưa gửi', () => {
    const onSubmit = vi.fn();
    mount(onSubmit);
    const go = screen.getByRole('button', { name: 'Ghi quyết định' });
    expect(go).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Lý do quyết định/), { target: { value: 'Đủ điều kiện phê duyệt.' } });
    fireEvent.click(go);
    expect(screen.getByTestId('decision-confirm').textContent).toContain('Không hoàn tác được');
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận phê duyệt' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
