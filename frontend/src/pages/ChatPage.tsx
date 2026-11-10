import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App, Button, Drawer, Grid } from 'antd';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ConversationSidebar } from '@/features/chat/components/ConversationSidebar';
import { MobileNavigationDrawer } from '@/components/layout/MobileNavigationDrawer';
import { ChatWorkspace } from '@/features/chat/components/ChatWorkspace';
import { SourceDrawer } from '@/features/chat/components/SourceDrawer';
import { HighlightDocumentViewer, type HighlightDocument } from '@/features/chat/components/HighlightDocumentViewer';
import { CustomerWorkspacePanel } from '@/features/customer/components/CustomerWorkspacePanel';
import { uiRoleFromRoles } from '@/auth/roleFromMe';
import { useMe } from '@/auth/session';
import styles from './ChatPage.module.css';
import type { Customer, LoanApplication, LoanApplicationStatus } from '@/types/customer';
import { LOAN_STATUS_LABEL } from '@/types/customer';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { useConversations } from '@/hooks/useConversations';
import { useConversationMessages } from '@/hooks/useConversationMessages';
import { useCreateConversation } from '@/hooks/useCreateConversation';
import { useRenameConversation } from '@/hooks/useRenameConversation';
import { useDeleteConversation } from '@/hooks/useDeleteConversation';
import { useTogglePinnedConversation } from '@/hooks/useTogglePinnedConversation';
import { useSendMessage } from '@/hooks/useSendMessage';
import { getErrorMessage } from '@/services/apiClient';
import { useCustomers } from '@/hooks/useCustomers';
import { claimCustomerAssignment } from '@/services/customerAssignmentService';
import { getAssignedLoanApplicationId } from '@/services/customerService';
import { setConversationCustomer } from '@/services/conversationService';
import type { ChatMessage, ChatMode } from '@/types/chat';
import type { ChatAttachment } from '@/types/attachment';
import type { ChatSource } from '@/types/source';
import type { UserProfile } from '@/types/user';

const FoundationPage = lazy(() => import('./FoundationPage'));

export default function ChatPage() {
  const { message: messageApi, modal } = App.useApp();
  const screens = Grid.useBreakpoint();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const isMobile = !screens.md;

  // Người dùng thật từ GET /me (không còn người dùng demo).
  const me = useMe().data;
  const user: UserProfile = useMemo(
    () => ({
      id: me?.employee_id ?? '',
      displayName: me?.full_name ?? '',
      role: me ? uiRoleFromRoles(me.roles) : null,
      branch: me?.branch_name ?? '',
    }),
    [me],
  );

  /* ---------------- Local UI state (không dùng TanStack Query) ---------------- */

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);
  activeConversationIdRef.current = activeConversationId;
  const openingCustomerRef = useRef<Promise<void> | null>(null);
  const [highlightDoc, setHighlightDoc] = useState<HighlightDocument | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sourceDrawerOpen, setSourceDrawerOpen] = useState(false);
  const [activeSources, setActiveSources] = useState<ChatSource[]>([]);
  const [composerValue, setComposerValue] = useState('');
  const [mode] = useState<ChatMode>('general');
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [activeAssignmentLeaseToken, setActiveAssignmentLeaseToken] = useState<string>();
  const [panelOpen, setPanelOpen] = useState(false);
  /** Độ rộng panel hồ sơ (% của vùng nội dung), điều chỉnh bằng thanh kéo. */
  const [panelWidth, setPanelWidth] = useState(46);

  /* ---------------- Server state ---------------- */

  const conversationsQuery = useConversations();
  const customersQuery = useCustomers();
  const messagesQuery = useConversationMessages(activeConversationId);
  const createConversation = useCreateConversation();
  const renameConversation = useRenameConversation();
  const deleteConversation = useDeleteConversation();
  const togglePin = useTogglePinnedConversation();

  const { streamingMessage, isStreaming, send, stop, regenerate } =
    useSendMessage(activeConversationId);

  const conversations = useMemo(() => conversationsQuery.data ?? [], [conversationsQuery.data]);
  const customers = useMemo(() => customersQuery.data ?? [], [customersQuery.data]);
  const messages = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data]);

  // Mở hội thoại đầu tiên khi vào ứng dụng.
  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    }
  }, [activeConversationId, conversations]);

  // Mở lại hội thoại đã gắn khách hàng (thanh bên hoặc tự mở) cũng phải nhận phân công
  // như khi chọn khách hàng, nếu không backend từ chối phân tích sâu với 409.
  const activeConversationCustomerId = conversations.find(
    (item) => item.id === activeConversationId,
  )?.customerId;
  useEffect(() => {
    if (!activeConversationCustomerId) return;
    const customer = customers.find((item) => item.id === activeConversationCustomerId);
    if (!customer) return;
    let cancelled = false;
    claimCustomerAssignment(customer.id, customer.assignmentVersion ?? 1)
      .then((lease) => {
        if (!cancelled) setActiveAssignmentLeaseToken(lease?.lease_token);
      })
      .catch(() => {
        // Không nhận được phân công: vẫn xem được; backend nêu lý do khi phân tích.
        if (!cancelled) setActiveAssignmentLeaseToken(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [activeConversationCustomerId, customers]);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );

  /**
   * Welcome State được tính ở đây (thay vì trong ChatWorkspace) để header và
   * workspace thống nhất: đúng một h1 trên màn hình ở mọi trạng thái.
   */
  const showWelcome =
    !messagesQuery.isLoading &&
    !messagesQuery.error &&
    messages.length === 0 &&
    !streamingMessage;

  /* ---------------- Handlers ---------------- */

  const handleSend = useCallback(
    async (content: string, attachments: ChatAttachment[]) => {
      // Đang mở hội thoại của khách vừa chọn -> chờ xong để tin nhắn gắn đúng khách hàng.
      const opening = openingCustomerRef.current;
      if (opening) await opening;
      let conversationId = activeConversationIdRef.current;

      // Chưa có hội thoại nào -> tạo mới trước khi gửi.
      if (!conversationId) {
        try {
          const created = await createConversation.mutateAsync({});
          conversationId = created.id;
          setActiveConversationId(created.id);
        } catch (error) {
          messageApi.error(getErrorMessage(error));
          return;
        }
      }

      setComposerValue('');
      await send({
        conversationId,
        content,
        attachments,
        mode,
        assignmentLeaseToken: activeAssignmentLeaseToken,
      });
    },
    [
      activeAssignmentLeaseToken,
      activeConversationId,
      createConversation,
      messageApi,
      mode,
      send,
    ],
  );

  /** Quick prompt / CTA / suggestion -> gửi ngay. */
  const handleQuickPrompt = useCallback(
    (prompt: string) => {
      if (isStreaming) {
        setComposerValue(prompt);
        return;
      }
      void handleSend(prompt, []);
    },
    [handleSend, isStreaming],
  );

  /**
   * Trang hồ sơ khách hàng điều hướng về đây kèm state `askCustomer`
   * -> tự động hỏi hệ chuyên gia số về khách hàng đó, rồi xoá state để
   * không lặp lại khi refresh/back.
   */
  useEffect(() => {
    const state = location.state as { askCustomer?: { id: string; name: string } } | null;
    if (state?.askCustomer) {
      handleQuickPrompt(`Cho tôi thông tin khách hàng ${state.askCustomer.name}.`);
      navigate('.', { replace: true, state: null });
    }
  }, [location.state, handleQuickPrompt, navigate]);

  const handleCreateConversation = useCallback(async () => {
    try {
      const created = await createConversation.mutateAsync({});
      setActiveConversationId(created.id);
      setComposerValue('');
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    }
  }, [createConversation, messageApi]);

  const handleRename = useCallback(
    (id: string, title: string) => {
      renameConversation.mutate(
        { conversationId: id, title },
        {
          onError: (error) => messageApi.error(getErrorMessage(error)),
          onSuccess: () => messageApi.success('Đã đổi tên cuộc trò chuyện'),
        },
      );
    },
    [messageApi, renameConversation],
  );

  const handleTogglePin = useCallback(
    (id: string, pinned: boolean) => {
      togglePin.mutate(
        { conversationId: id, pinned },
        { onError: (error) => messageApi.error(getErrorMessage(error)) },
      );
    },
    [messageApi, togglePin],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteConversation.mutate(id, {
        onSuccess: () => {
          messageApi.success('Đã xoá cuộc trò chuyện');
          if (id === activeConversationId) {
            const next = conversations.find((item) => item.id !== id);
            setActiveConversationId(next?.id ?? null);
          }
        },
        onError: (error) => messageApi.error(getErrorMessage(error)),
      });
    },
    [activeConversationId, conversations, deleteConversation, messageApi],
  );

  const handleViewSources = useCallback((message: ChatMessage) => {
    setActiveSources(message.sources ?? []);
    setSourceDrawerOpen(true);
  }, []);

  /* ---------------- Khách hàng & phê duyệt ---------------- */

  /**
   * Mở phiên chat GẮN VỚI một khách hàng: nếu đã có phiên của khách hàng đó thì
   * mở lại, chưa có thì tạo mới. Chuyên viên chat theo từng khách hàng.
   */
  const openCustomerConversation = useCallback(
    async (customer: Customer) => {
      try {
        try {
          const lease = await claimCustomerAssignment(
            customer.id,
            customer.assignmentVersion ?? 1,
          );
          setActiveAssignmentLeaseToken(lease?.lease_token);
        } catch (error) {
          // Không nhận được phân công: vẫn mở hội thoại có khách hàng để xem; quyền và
          // phân công được backend kiểm khi phân tích nên người dùng nhận lý do rõ ràng.
          setActiveAssignmentLeaseToken(undefined);
          messageApi.warning(getErrorMessage(error));
        }

        const existing = conversations.find((item) => item.customerId === customer.id);
        if (existing) {
          activeConversationIdRef.current = existing.id;
          setActiveConversationId(existing.id);
          return;
        }

        let loanApplicationId: string | undefined;
        try {
          loanApplicationId = await getAssignedLoanApplicationId(customer.id);
        } catch {
          // A customer-only conversation remains useful for direct/document queries.
        }
        const created = await createConversation.mutateAsync({
          customerId: customer.id,
          customerName: customer.fullName,
          loanApplicationId,
        });
        activeConversationIdRef.current = created.id;
        setActiveConversationId(created.id);
        setComposerValue('');
      } catch (error) {
        messageApi.error(getErrorMessage(error));
      }
    },
    [conversations, createConversation, messageApi],
  );

  /** Chọn khách hàng (lệnh `/`) -> mở phiên chat của họ + panel hồ sơ nửa màn hình. */
  const handleSelectCustomer = useCallback(
    (customer: Customer) => {
      setActiveCustomer(customer);
      setHighlightDoc(null);
      setPanelOpen(true);
      const opening = openCustomerConversation(customer).finally(() => {
        if (openingCustomerRef.current === opening) openingCustomerRef.current = null;
      });
      openingCustomerRef.current = opening;
    },
    [openCustomerConversation],
  );

  /**
   * Upload hồ sơ khi chưa chọn khách hàng -> backend đã tự tạo khách nháp.
   * Gắn khách đó vào hội thoại hiện tại (server) + panel hồ sơ (client);
   * tên khách sẽ được vision cập nhật từ nội dung hồ sơ sau tin nhắn đầu.
   */
  const handleCustomerAutoCreated = useCallback(
    (customerId: string) => {
      if (activeConversationId) {
        void setConversationCustomer(activeConversationId, customerId);
      }
      void customersQuery.refetch().then((result) => {
        const created = result.data?.find((item) => item.id === customerId);
        if (created) {
          setActiveCustomer(created);
          setPanelOpen(true);
        }
      });
    },
    [activeConversationId, customersQuery],
  );

  /** Bấm thumbnail hồ sơ highlight -> panel phải hiển thị ảnh đã đánh dấu. */
  const handleOpenHighlightDocument = useCallback((doc: HighlightDocument) => {
    setHighlightDoc(doc);
    setPanelOpen(true);
  }, []);

  /** Xem hồ sơ khách hàng (từ card trong chat) -> mở panel, không đổi phiên chat. */
  const handleViewCustomer = useCallback((customerId: string) => {
    const found = customers.find((item) => item.id === customerId);
    if (found) {
      setActiveCustomer(found);
      setPanelOpen(true);
    }
  }, [customers]);

  const handleSelectConversation = useCallback((conversationId: string) => {
    setActiveAssignmentLeaseToken(undefined);
    setActiveConversationId(conversationId);
  }, []);

  /** Đưa các hồ sơ đã chọn trong lưới vào chat để hệ chuyên gia số thẩm định. */
  const handleReviewInChat = useCallback(
    (records: LoanApplication[]) => {
      if (!records.length) return;
      const codes = records.map((r) => r.code).join(', ');
      const prompt =
        records.length === 1
          ? `Thẩm định hồ sơ vay ${codes}.`
          : `Thẩm định các hồ sơ vay sau: ${codes}.`;
      handleQuickPrompt(prompt);
    },
    [handleQuickPrompt],
  );

  const handleLoanDecision = useCallback(
    (application: LoanApplication, status: LoanApplicationStatus, note: string) => {
      // Bản demo chỉ ghi nhận cục bộ — không gửi tới hệ thống tín dụng thật.
      messageApi.success(
        `${LOAN_STATUS_LABEL[status]}: ${application.code}${note ? ` — ${note}` : ''}`,
      );
    },
    [messageApi],
  );

  const showAiPolicy = useCallback(() => {
    modal.info({
      title: 'Chính sách sử dụng Trợ lý AI',
      content:
        'Trợ lý AI là công cụ thông tin. Nội dung mang tính tham khảo, không thay thế tư vấn chính thức và không thực hiện giao dịch trong phiên bản demo này.',
      okText: 'Đã hiểu',
    });
  }, [modal]);

  /* ---------------- Foundation mode ---------------- */

  // ?view=foundation -> trang kiểm chứng nền tảng.
  if (searchParams.get('view') === 'foundation') {
    return (
      <Suspense fallback={<LoadingScreen message="Đang tải Foundation Page" />}>
        <FoundationPage />
      </Suspense>
    );
  }

  /* ---------------- Panel resize ---------------- */

  const showPanel = panelOpen && activeCustomer !== null;
  const customerRecords = useMemo(
    () => ([] as LoanApplication[]),
    [activeCustomer],
  );

  /**
   * Kéo thanh giữa chat và panel để đổi tỉ lệ. Tính theo % của vùng nội dung,
   * kẹp trong khoảng 32–62% để không bên nào bị bóp quá hẹp.
   */
  const handleResizeStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const container = event.currentTarget.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const onMove = (moveEvent: PointerEvent) => {
      const fromRight = ((rect.right - moveEvent.clientX) / rect.width) * 100;
      setPanelWidth(Math.min(62, Math.max(32, fromRight)));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, []);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setHighlightDoc(null);
  }, []);

  const openFullProfile = useCallback(
    (customer: Customer) => {
      setPanelOpen(false);
      navigate(`/customer/${customer.id}`);
    },
    [navigate],
  );

  /* ---------------- Render ---------------- */

  const sidebarProps = {
    conversations,
    activeConversationId,
    loading: conversationsQuery.isLoading,
    error: conversationsQuery.error,
    onRetry: () => void conversationsQuery.refetch(),
    user,
    onSelectConversation: handleSelectConversation,
    onCreateConversation: () => void handleCreateConversation(),
    onRenameConversation: handleRename,
    onTogglePin: handleTogglePin,
    onDeleteConversation: handleDelete,
  };

  return (
    <>
      <div className={styles.frame}>
        {!isMobile && (
          <aside className={styles.convCol} aria-label="Danh sách cuộc trò chuyện">
            <ConversationSidebar {...sidebarProps} collapsed={false} />
          </aside>
        )}
        <div className={styles.mainCol}>
          <div className={styles.toolbar}>
            {isMobile && (
              <Button aria-label="Mở danh sách cuộc trò chuyện" onClick={() => setMobileNavOpen(true)}>
                ☰
              </Button>
            )}
            {showWelcome ? (
              <span className={styles.toolbarTitle}>{activeConversation?.title ?? 'Trợ lý AI'}</span>
            ) : (
              <h1 className={styles.toolbarTitle}>{activeConversation?.title ?? 'Trợ lý AI'}</h1>
            )}
            <Button onClick={() => void handleCreateConversation()}>Cuộc trò chuyện mới</Button>
          </div>
        {/* Split-view: chat bên trái, panel hồ sơ khách hàng bên phải (desktop). */}
        <div className={styles.splitRow}>
          <div className={styles.chatCol}>
            <ChatWorkspace
              messages={messages}
              streamingMessage={streamingMessage}
              loading={messagesQuery.isLoading}
              error={messagesQuery.error}
              onRetryLoad={() => void messagesQuery.refetch()}
              composerValue={composerValue}
              onComposerChange={setComposerValue}
              onSend={(content, attachments) => void handleSend(content, attachments)}
              onStop={stop}
              onQuickPrompt={handleQuickPrompt}
              onRegenerate={() => void regenerate()}
              onViewSources={handleViewSources}
              isStreaming={isStreaming}
              showWelcome={showWelcome}
              staffName={user.displayName}
              customers={customers}
              onSelectCustomer={handleSelectCustomer}
              onCustomerAutoCreated={handleCustomerAutoCreated}
              onOpenHighlightDocument={handleOpenHighlightDocument}
              onViewCustomer={handleViewCustomer}
              onLoanDecision={handleLoanDecision}
              uploadContext={{
                customerId: activeConversation?.customerId,
                loanApplicationId: activeConversation?.activeLoanApplicationId,
              }}
            />
          </div>

          {/* Panel inline chỉ trên desktop; mobile dùng Drawer bên dưới. */}
          {showPanel && !isMobile && activeCustomer && (
            <div className={styles.panelCol} style={{ width: `${panelWidth}%` }}>
              <div
                className={styles.resizer}
                role="separator"
                aria-orientation="vertical"
                aria-label="Kéo để đổi độ rộng panel"
                onPointerDown={handleResizeStart}
              />
              {highlightDoc ? (
                <HighlightDocumentViewer
                  document={highlightDoc}
                  onBack={() => setHighlightDoc(null)}
                  onClose={closePanel}
                />
              ) : (
                <CustomerWorkspacePanel
                  customer={activeCustomer}
                  records={customerRecords}
                  onClose={closePanel}
                  onOpenFullPage={openFullProfile}
                  onReviewInChat={handleReviewInChat}
                  onLoanDecision={handleLoanDecision}
                />
              )}
            </div>
          )}
        </div>
        </div>
      </div>

      {isMobile && (
        <MobileNavigationDrawer
          {...sidebarProps}
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />
      )}

      <SourceDrawer
        open={sourceDrawerOpen}
        onClose={() => setSourceDrawerOpen(false)}
        sources={activeSources}
      />

      {/* Mobile: panel hồ sơ hiển thị dạng Drawer gần full màn hình. */}
      {isMobile && activeCustomer && (
        <Drawer
          open={showPanel}
          onClose={closePanel}
          placement="right"
          width="100%"
          closable={false}
          styles={{ body: { padding: 0 } }}
        >
          {highlightDoc ? (
            <HighlightDocumentViewer
              document={highlightDoc}
              onBack={() => setHighlightDoc(null)}
              onClose={closePanel}
            />
          ) : (
            <CustomerWorkspacePanel
              customer={activeCustomer}
              records={customerRecords}
              onClose={closePanel}
              onOpenFullPage={openFullProfile}
              onReviewInChat={handleReviewInChat}
              onLoanDecision={handleLoanDecision}
            />
          )}
        </Drawer>
      )}

      {/* Nút ẩn phục vụ liên kết chính sách AI từ sidebar. */}
      <button type="button" onClick={showAiPolicy} className="sr-only">
        Chính sách sử dụng AI
      </button>
    </>
  );
}
