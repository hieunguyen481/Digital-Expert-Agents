import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ActionButton, AgentTeam, CaseStepper, StateBlock } from './index';

describe('ActionButton', () => {
  it('khóa kèm lý do: aria-disabled, aria-describedby, không gọi onClick (D4)', async () => {
    const onClick = vi.fn();
    render(<ActionButton variant="gold" lockedReason="Còn 2 mục chưa xong." onClick={onClick}>Chuyển</ActionButton>);
    const btn = screen.getByRole('button', { name: /Chuyển/ });
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    expect(btn).not.toBeDisabled();
    expect(document.getElementById(btn.getAttribute('aria-describedby')!)).toHaveTextContent('Còn 2 mục chưa xong.');
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('AgentTeam', () => {
  it.each(['full', 'compact', 'strip'] as const)('biến thể %s có đủ 6 agent và người quyết định', (variant) => {
    render(<AgentTeam variant={variant} human={{ who: 'Cấp phê duyệt' }} />);
    for (const n of ['Planner', 'Credit', 'Compliance', 'Operations', 'Document', 'Validation']) {
      expect(screen.getAllByText(n).length).toBeGreaterThan(0);
    }
    expect(screen.getByText('Cấp phê duyệt')).toBeInTheDocument();
  });
  it('tổng thời gian chỉ hiện khi đủ số đo thật', () => {
    const { rerender } = render(<AgentTeam variant="compact" states={{ planner: 'done' }} />);
    expect(screen.queryByText(/giây$/)).toBeNull();
    const all = { planner: 'done', credit: 'done', compliance: 'done', operations: 'done', document: 'done', validation: 'done' } as const;
    rerender(<AgentTeam variant="compact" states={all} durationsMs={{ planner: 2000, credit: 3000, compliance: 1000, operations: 1000, document: 4000, validation: 1000 }} />);
    expect(screen.getByText('7,0 giây')).toBeInTheDocument();
  });
});

describe('CaseStepper và StateBlock', () => {
  it('đánh dấu bước hiện tại', () => {
    render(<CaseStepper current={2} />);
    expect(screen.getByText('Thẩm định').closest('li')).toHaveAttribute('aria-current', 'step');
  });
  it('403 có role alert và đúng một nút', () => {
    render(<StateBlock kind="forbidden" alert title="Không có quyền" action={<button>Về</button>} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
