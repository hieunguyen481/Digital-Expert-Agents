import { BellOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Popover } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/services/apiClient';
import styles from './shell.module.css';

interface Notification {
  id: string;
  title: string;
  message: string;
  status: 'UNREAD' | 'READ' | 'DISMISSED';
  resource_type: string | null;
  resource_id: string | null;
  created_at: string;
}
interface NotificationList {
  items?: Notification[];
  meta: { total: number };
}

/** Chuông thông báo: danh sách gần nhất, bấm một dòng thì đánh dấu đã đọc và mở hồ sơ. */
export function NotificationBell() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const unread = useQuery<boolean>({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => {
      const { data } = await apiClient.get<NotificationList>('/notifications', {
        params: { status: 'UNREAD', page_size: 1 },
      });
      return data.meta.total > 0;
    },
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  });
  const list = useQuery<Notification[]>({
    queryKey: ['notifications', 'list'],
    enabled: open,
    queryFn: async () => {
      const { data } = await apiClient.get<NotificationList>('/notifications', { params: { page_size: 20 } });
      return data.items ?? [];
    },
  });
  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const markAll = async () => {
    await Promise.all((list.data ?? []).filter((n) => n.status === 'UNREAD').map((n) => markRead.mutateAsync(n.id)));
  };
  const items = list.data ?? [];
  const content = (
    <div className={styles.bellPanel} data-testid="notification-list">
      <div className={styles.bellHead}>
        <b>Thông báo</b>
        <button type="button" className={styles.bellLink} disabled={!items.some((n) => n.status === 'UNREAD')} onClick={() => void markAll()}>
          Đánh dấu tất cả đã đọc
        </button>
      </div>
      {items.length === 0 && <div className={styles.bellEmpty}>{list.isLoading ? 'Đang tải…' : 'Chưa có thông báo nào.'}</div>}
      {items.map((n) => (
        <button
          type="button"
          key={n.id}
          className={`${styles.bellItem} ${n.status === 'UNREAD' ? styles.bellUnread : ''}`}
          data-testid="notification-item"
          data-status={n.status}
          onClick={() => {
            if (n.status === 'UNREAD') markRead.mutate(n.id);
            if (n.resource_type === 'LOAN_APPLICATION' && n.resource_id) {
              setOpen(false);
              navigate(`/ho-so-vay/${n.resource_id}`);
            }
          }}
        >
          <b>{n.title}</b>
          <span>{n.message}</span>
          <small>{new Date(n.created_at).toLocaleString('vi-VN')}</small>
        </button>
      ))}
      <button type="button" className={styles.bellAll} data-testid="notification-all" onClick={() => { setOpen(false); navigate('/thong-bao'); }}>
        Xem tất cả thông báo
      </button>
    </div>
  );
  return (
    <Popover trigger="click" placement="bottomRight" open={open} onOpenChange={setOpen} content={content} arrow={false}>
      <button type="button" className={styles.bell} aria-label="Thông báo" title="Thông báo">
        <BellOutlined />
        {unread.data && <i className={styles.bellDot} data-testid="bell-dot" />}
      </button>
    </Popover>
  );
}
