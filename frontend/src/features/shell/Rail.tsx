import {
  AuditOutlined,
  BankOutlined,
  BarChartOutlined,
  BellOutlined,
  BookOutlined,
  FileDoneOutlined,
  InboxOutlined,
  PlusOutlined,
  SettingOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { message } from 'antd';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { UI_ROLE_LABEL, type UiRole } from '@/auth/roleFromMe';
import { SHBLogo } from '@/components/common/SHBLogo';
import { AI_PAGE, COMMON_GROUP_START_PAGE, RAIL_ITEMS, type RailItem } from './navigation';
import styles from './shell.module.css';

const ICONS: Record<RailItem['icon'], ReactNode> = {
  inbox: <InboxOutlined />,
  plus: <PlusOutlined />,
  building: <BankOutlined />,
  filecheck: <FileDoneOutlined />,
  users: <TeamOutlined />,
  book: <BookOutlined />,
  clock: <AuditOutlined />,
  gear: <SettingOutlined />,
  spark: <ThunderboltOutlined />,
  bell: <BellOutlined />,
  dash: <BarChartOutlined />,
};

interface RailProps {
  role: UiRole;
  /** Số việc của tôi; chỉ gắn vào mục đầu tiên. */
  badge?: number;
  onOpenAi: () => void;
}

/** Thanh bên theo vai (§6 "Thanh bên theo vai", §11.4): nền navy, mục chọn nền giấy + vạch đồng. */
export function Rail({ role, badge, onOpenAi }: RailProps) {
  const items = RAIL_ITEMS[role];
  const separatorBefore = items.findIndex((i) => i.page === COMMON_GROUP_START_PAGE);
  return (
    <nav className={styles.side} aria-label="Điều hướng chính">
      <div className={styles.brand}>
        <SHBLogo variant="white" showProductName />
      </div>
      <div className={styles.navRole}>{UI_ROLE_LABEL[role]}</div>
      {items.map((entry, index) => {
        const isAi = entry.page === AI_PAGE;
        const showBadge = index === 0 && typeof badge === 'number' && badge > 0;
        const content = (
          <>
            <span className={styles.navIcon} aria-hidden>
              {ICONS[entry.icon]}
            </span>
            <span className={styles.navLabel}>{entry.label}</span>
            {showBadge && (
              <span className={styles.navCount} data-testid="rail-badge">
                {badge}
              </span>
            )}
          </>
        );
        const separator = index === separatorBefore && index > 0 ? <div key={`sep-${entry.page}`} className={styles.navSep} role="separator" /> : null;
        let node: ReactNode;
        if (isAi) {
          node = (
            <button type="button" className={styles.navItem} aria-label={entry.label} onClick={onOpenAi}>
              {content}
            </button>
          );
        } else if (entry.path) {
          node = (
            <NavLink to={entry.path} className={styles.navItem} aria-label={entry.label}>
              {content}
            </NavLink>
          );
        } else {
          node = (
            <button
              type="button"
              className={styles.navItem}
              aria-label={entry.label}
              aria-disabled="true"
              onClick={() => void message.info(`${entry.label}: sẽ có ở đợt sau`)}
            >
              {content}
            </button>
          );
        }
        return (
          <span key={entry.page} className={styles.navCell}>
            {separator}
            {node}
          </span>
        );
      })}
    </nav>
  );
}
