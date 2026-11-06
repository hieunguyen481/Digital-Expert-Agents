import { CloseOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Button, Tag } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatComposer } from '@/features/chat/components/ChatComposer';
import { MessageList } from '@/features/chat/components/MessageList';
import { useConversationMessages } from '@/hooks/useConversationMessages';
import { useConversations } from '@/hooks/useConversations';
import { useCreateConversation } from '@/hooks/useCreateConversation';
import { useSendMessage } from '@/hooks/useSendMessage';
import { getErrorMessage } from '@/services/apiClient';
import type { ChatAttachment } from '@/types/attachment';
import { useAiPanel } from './AiPanelContext';
import styles from './ai-panel.module.css';

/**
 * Panel Trợ lý AI 408px, đẩy nội dung. Luôn mount (khi vai trò có AI) để giữ chữ đang gõ;
 * đóng thì `inert`. Ngữ cảnh chỉ hiển thị trên chip, chưa gửi về backend (Kế hoạch 6).
 */
export function AiPanel() {
  const { open, context, close } = useAiPanel();
  const [value, setValue] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);

  const conversations = useConversations();
  const messages = useConversationMessages(conversationId);
  const create = useCreateConversation();
  const { streamingMessage, isStreaming, send, stop } = useSendMessage(conversationId);

  useEffect(() => {
    if (!conversationId && conversations.data?.length) setConversationId(conversations.data[0].id);
  }, [conversationId, conversations.data]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      el.removeAttribute('inert');
      // Đợi panel hiện ra (visibility) rồi mới chuyển focus vào trong.
      // Không cướp focus nếu người dùng đã đặt con trỏ trong panel (đang gõ).
      const id = window.setTimeout(() => {
        if (!el.contains(document.activeElement)) {
          el.querySelector<HTMLElement>('textarea, input, button')?.focus();
        }
      }, 50);
      return () => window.clearTimeout(id);
    } else {
      el.setAttribute('inert', '');
    }
  }, [open]);

  const handleSend = useCallback(
    async (content: string, attachments: ChatAttachment[]) => {
      let id = conversationId;
      if (!id) {
        try {
          id = (await create.mutateAsync({})).id;
          setConversationId(id);
        } catch (e) {
          setError(getErrorMessage(e));
          return;
        }
      }
      setError(null);
      setValue('');
      await send({ conversationId: id, content, attachments });
    },
    [conversationId, create, send],
  );

  return (
    <aside
      ref={ref}
      className={styles.panel}
      aria-label="Trợ lý AI"
      aria-hidden={!open}
      data-open={open}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          close();
        }
      }}
    >
      <div className={styles.head}>
        <ThunderboltOutlined aria-hidden />
        <b>Trợ lý AI</b>
        <Button type="text" aria-label="Đóng Trợ lý AI" icon={<CloseOutlined />} onClick={close} />
      </div>
      {context && (
        <div className={styles.chipRow}>
          <Tag className={styles.chip} data-testid="ai-context-chip">
            {context.label}
          </Tag>
        </div>
      )}
      {error && <div role="alert" className={styles.error}>{error}</div>}
      <div className={styles.body}>
        <MessageList
          messages={messages.data ?? []}
          streamingMessage={streamingMessage}
          loading={messages.isLoading}
          error={messages.error}
          onRetry={() => void messages.refetch()}
          onPrompt={setValue}
          busy={isStreaming}
        />
      </div>
      <ChatComposer
        value={value}
        onChange={setValue}
        onSend={(content, attachments) => void handleSend(content, attachments)}
        onStop={stop}
        isStreaming={isStreaming}
        placeholder="Hỏi về hồ sơ, chính sách…"
      />
    </aside>
  );
}
