import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ActionButton, StateBlock, StatusPill } from '@/components/ui';
import { PageHead } from '@/features/shell/PageHead';
import apiClient from '@/services/apiClient';
import { formatDateTime } from '@/utils/formatDate';
import { groupNotifications } from './cleanText';
import { CodeText } from '@/components/common/CodeText';
import styles from './notifications.module.css';

export interface NotificationRow {
  id: string;
  title: string;
  message: string;
  status: 'UNREAD' | 'READ' | 'DISMISSED';
  resource_type: string | null;
  resource_id: string | null;
  created_at: string;
}

/** Trang Thông báo (mockup 33): cùng API với chuông, danh sách dài hơn, bấm một dòng để mở hồ sơ liên quan. */
export default function NotificationsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const q = useQuery<NotificationRow[]>({
    queryKey: ['notifications', 'page'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ items?: NotificationRow[] }>('/notifications', { params: { page_size: 100 } });
      return data.items ?? [];
    },
  });
  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const items = q.data ?? [];
  const groups = groupNotifications(items);
  const unread = items.filter((n) => n.status === 'UNREAD');
  const markAll = async () => {
    await Promise.all(unread.map((n) => markRead.mutateAsync(n.id)));
  };
  const open = (g: (typeof groups)[number]) => {
    const n = g.head;
    if (g.unread) items.filter((x) => g.ids.includes(x.id) && x.status === 'UNREAD').forEach((x) => markRead.mutate(x.id));
    if (n.resource_type === 'LOAN_APPLICATION' && n.resource_id) navigate(`/ho-so-vay/${n.resource_id}`);
  };
  return (
    <>
      <PageHead
        title="Thông báo"
        facts={[q.data ? (unread.length > 0 ? `${unread.length} chưa đọc` : 'Đã đọc hết') : null]}
        actions={
          <ActionButton onClick={() => void markAll()} lockedReason={unread.length === 0 ? 'Không có thông báo chưa đọc.' : undefined}>
            Đánh dấu đã đọc hết
          </ActionButton>
        }
      />
      <div className={styles.page}>
        {q.isError && (
          <StateBlock kind="error" title="Không tải được thông báo" description="Thử lại sau ít phút." action={<ActionButton onClick={() => void q.refetch()}>Tải lại</ActionButton>} />
        )}
        {q.isLoading && <Skeleton active />}
        {q.data && items.length === 0 && (
          <StateBlock kind="empty" title="Chưa có thông báo" description="Thông báo về hồ sơ của bạn sẽ hiện ở đây." />
        )}
        {items.length > 0 && (
          <section className={styles.card} aria-label="Danh sách thông báo">
            <ul className={styles.list} data-testid="notification-page-list">
              {groups.map((g) => {
                const n = g.head;
                const linked = n.resource_type === 'LOAN_APPLICATION' && !!n.resource_id;
                return (
                  <li key={n.id} className={styles.row} data-status={g.unread ? 'UNREAD' : 'READ'}>
                    <StatusPill tone={g.unread ? 'info' : 'neutral'}>{g.unread ? 'Mới' : 'Đã đọc'}</StatusPill>
                    <button type="button" className={styles.body} onClick={() => open(g)} aria-label={linked ? `${g.title}. Mở hồ sơ` : g.title}>
                      <b><CodeText>{g.title}</CodeText>{g.count > 1 && <span className={styles.count}> · {g.count} lần</span>}</b>
                      <span><CodeText>{g.message}</CodeText></span>
                    </button>
                    <time className={styles.time} dateTime={n.created_at}>{formatDateTime(n.created_at)}</time>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
