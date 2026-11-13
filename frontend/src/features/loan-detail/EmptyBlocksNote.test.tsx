import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyBlocksNote, emptyBlocks } from './EmptyBlocksNote';

describe('EmptyBlocksNote', () => {
  it('liệt kê đúng các khối rỗng theo thứ tự trang', () => {
    const e = emptyBlocks({ metrics: true, flags: true, conditions: false, collaterals: true });
    expect(e.map((x) => x.key)).toEqual(['metrics', 'flags', 'collaterals']);
    render(<EmptyBlocksNote labels={e.map((x) => x.label)} />);
    expect(screen.getByTestId('loan-empty-blocks').textContent).toBe('Chưa có: chỉ số có nguồn, cờ, tài sản bảo đảm.');
  });
  it('không khối nào rỗng thì danh sách rỗng', () => {
    expect(emptyBlocks({ metrics: false, flags: false, conditions: false, collaterals: false })).toEqual([]);
  });
});
