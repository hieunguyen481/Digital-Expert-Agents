import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WelcomeState } from './WelcomeState';

describe('WelcomeState – L13', () => {
  it('lời chào hiện đủ họ tên', () => {
    render(<WelcomeState onSelectPrompt={vi.fn()} staffName="Nguyễn Văn Thẩm Định" />);
    expect(screen.getByText('Nguyễn Văn Thẩm Định')).toBeTruthy();
  });
});
