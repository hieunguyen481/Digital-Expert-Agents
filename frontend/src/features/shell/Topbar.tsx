import { BellOutlined, LogoutOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Dropdown } from 'antd';
import { UI_ROLE_LABEL, type UiRole } from '@/auth/roleFromMe';
import { logout } from '@/auth/keycloak';
import apiClient from '@/services/apiClient';
import type { Me } from '@/types/me';
import styles from './shell.module.css';

interface NotificationList {
  meta: { total: number };
}

function useUnreadNotifications() {
  return useQuery<boolean>({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => {
      const { data } = await apiClient.get<NotificationList>('/notifications', {
        params: { status: 'UNREAD', page_size: 1 },
      });
      return data.meta.total > 0;
    },
    refetchOnWindowFocus: true,
  });
}

export function Topbar({ me, role }: { me: Me; role: UiRole }) {
  const unread = useUnreadNotifications();
  const initials = me.full_name
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className={styles.topbar}>
      <span className={styles.appName}>SHB AI Assistant</span>
      <label className={styles.search} title="Tìm kiếm sẽ có ở đợt sau">
        <SearchOutlined aria-hidden />
        <input
          disabled
          aria-label="Tìm kiếm"
          placeholder="Tìm hồ sơ, khách hàng, MST, điều khoản…"
          title="Tìm kiếm sẽ có ở đợt sau"
        />
      </label>
      <span className={styles.spacer} />
      <span className={styles.bell} aria-label="Thông báo" role="img" title="Thông báo">
        <BellOutlined />
        {unread.data && <i className={styles.bellDot} data-testid="bell-dot" />}
      </span>
      <Dropdown
        trigger={['click']}
        menu={{
          items: [
            {
              key: 'logout',
              icon: <LogoutOutlined />,
              label: 'Đăng xuất',
              onClick: () => void logout(),
            },
          ],
        }}
      >
        <button type="button" className={styles.user} aria-label="Tài khoản">
          <Avatar size={32} className={styles.avatar}>
            {initials}
          </Avatar>
          <span className={styles.userText}>
            <b>{me.full_name}</b>
            <small>{UI_ROLE_LABEL[role]}</small>
          </span>
        </button>
      </Dropdown>
    </div>
  );
}
