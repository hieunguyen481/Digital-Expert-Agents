import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/chat/components/MessageList', () => ({ MessageList: () => <div /> }));
vi.mock('@/features/chat/components/ChatComposer', () => ({
  ChatComposer: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea aria-label="Nhập câu hỏi" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));
vi.mock('@/hooks/useConversations', () => ({ useConversations: () => ({ data: [{ id: 'c1' }] }) }));
vi.mock('@/hooks/useConversationMessages', () => ({
  useConversationMessages: () => ({ data: [], isLoading: false, refetch: vi.fn() }),
}));
vi.mock('@/hooks/useCreateConversation', () => ({ useCreateConversation: () => ({ mutateAsync: vi.fn() }) }));
vi.mock('@/hooks/useSendMessage', () => ({
  useSendMessage: () => ({ streamingMessage: null, isStreaming: false, send: vi.fn(), stop: vi.fn() }),
}));

import { AiPanel } from './AiPanel';
import { AiPanelProvider, useAiPanel } from './AiPanelContext';
import { useAiShortcut } from './useAiShortcut';

function Harness() {
  const { openWith, open } = useAiPanel();
  useAiShortcut();
  return (
    <>
      <button onClick={() => openWith({ type: 'case', id: '1', label: 'HS-1' })}>Hỏi AI 1</button>
      <button onClick={() => openWith({ type: 'case', id: '2', label: 'HS-2' })}>Hỏi AI 2</button>
      <span data-testid="state">{open ? 'open' : 'closed'}</span>
      <AiPanel />
    </>
  );
}

const setup = (enabled = true) =>
  render(
    <AiPanelProvider enabled={enabled}>
      <Harness />
    </AiPanelProvider>,
  );

describe('AiPanel', () => {
  it('mở bằng nút và Ctrl+J', async () => {
    setup();
    expect(screen.getByTestId('state')).toHaveTextContent('closed');
    await userEvent.click(screen.getByText('Hỏi AI 1'));
    expect(screen.getByTestId('state')).toHaveTextContent('open');
    await userEvent.keyboard('{Control>}j{/Control}');
    expect(screen.getByTestId('state')).toHaveTextContent('closed');
    await userEvent.keyboard('{Control>}j{/Control}');
    expect(screen.getByTestId('state')).toHaveTextContent('open');
  });

  it('mở lần hai chỉ đổi chip, giữ chữ đang gõ, không nhân đôi panel', async () => {
    setup();
    await userEvent.click(screen.getByText('Hỏi AI 1'));
    await userEvent.type(screen.getByLabelText('Nhập câu hỏi'), 'xin chào');
    await userEvent.click(screen.getByText('Hỏi AI 2'));
    expect(screen.getAllByLabelText('Trợ lý AI', { selector: 'aside' })).toHaveLength(1);
    expect(screen.getByTestId('ai-context-chip')).toHaveTextContent('HS-2');
    expect(screen.getByLabelText('Nhập câu hỏi')).toHaveValue('xin chào');
  });

  it('Ctrl+J khi đang gõ trong ô nhập không mất chữ', async () => {
    setup();
    await userEvent.click(screen.getByText('Hỏi AI 1'));
    await userEvent.type(screen.getByLabelText('Nhập câu hỏi'), 'abc');
    await userEvent.keyboard('{Control>}j{/Control}');
    await userEvent.keyboard('{Control>}j{/Control}');
    expect(screen.getByLabelText('Nhập câu hỏi')).toHaveValue('abc');
  });

  it('Esc đóng và trả focus về nút đã mở', async () => {
    setup();
    const opener = screen.getByText('Hỏi AI 1');
    opener.focus();
    await userEvent.click(opener);
    await userEvent.keyboard('{Escape}');
    expect(screen.getByTestId('state')).toHaveTextContent('closed');
    await Promise.resolve();
    expect(opener).toHaveFocus();
  });

  it('quản trị không mở được', async () => {
    setup(false);
    await userEvent.click(screen.getByText('Hỏi AI 1'));
    expect(screen.getByTestId('state')).toHaveTextContent('closed');
  });
});
