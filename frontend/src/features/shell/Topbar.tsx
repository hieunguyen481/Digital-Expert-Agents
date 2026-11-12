import { LogoutOutlined } from '@ant-design/icons';
import { Avatar, Dropdown } from 'antd';
import { UI_ROLE_LABEL, type UiRole } from '@/auth/roleFromMe';
import { logout } from '@/auth/keycloak';
import type { Me } from '@/types/me';
import type { PageWidth } from './navigation';
import { SearchBox } from './SearchBox';
import { NotificationBell } from './NotificationBell';
import styles from './shell.module.css';

export function Topbar({ me, role, width = 'wide' }: { me: Me; role: UiRole; width?: PageWidth }) {
  const initials = me.full_name
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className={styles.topbar}>
      <div className={`${styles.topbarIn} ${width === 'narrow' ? styles.topbarNarrow : width === 'full' ? styles.topbarFull : ''}`}>
      <SearchBox />
      <span className={styles.spacer} />
      <NotificationBell />
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
    </div>
  );
}
