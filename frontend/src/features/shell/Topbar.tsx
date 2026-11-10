import { LogoutOutlined, SearchOutlined } from '@ant-design/icons';
import { Avatar, Dropdown } from 'antd';
import { UI_ROLE_LABEL, type UiRole } from '@/auth/roleFromMe';
import { logout } from '@/auth/keycloak';
import type { Me } from '@/types/me';
import { DemoSwitcher } from './DemoSwitcher';
import { NotificationBell } from './NotificationBell';
import styles from './shell.module.css';

export function Topbar({ me, role }: { me: Me; role: UiRole }) {
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
      {me.roles.includes('admin') && <DemoSwitcher />}
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
  );
}
