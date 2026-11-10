import {
  BankOutlined,
  BookOutlined,
  ClockCircleOutlined,
  DashboardOutlined,
  FileDoneOutlined,
  InboxOutlined,
  MessageOutlined,
  PlusOutlined,
  SettingOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Tooltip, message } from 'antd';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import type { UiRole } from '@/auth/roleFromMe';
import { AI_PAGE, RAIL_ITEMS, type RailItem } from './navigation';
import styles from './shell.module.css';

const ICONS: Record<RailItem['icon'], ReactNode> = {
  inbox: <InboxOutlined />,
  plus: <PlusOutlined />,
  building: <BankOutlined />,
  filecheck: <FileDoneOutlined />,
  users: <TeamOutlined />,
  book: <BookOutlined />,
  clock: <ClockCircleOutlined />,
  gear: <SettingOutlined />,
  spark: <ThunderboltOutlined />,
  chat: <MessageOutlined />,
  dash: <DashboardOutlined />,
};

interface RailProps {
  role: UiRole;
  /** Số việc của tôi; chỉ gắn vào mục đầu tiên. */
  badge?: number;
  onOpenAi: () => void;
}

export function Rail({ role, badge, onOpenAi }: RailProps) {
  const items = RAIL_ITEMS[role];
  return (
    <nav className={styles.rail} aria-label="Điều hướng chính">
      <div className={styles.railLogo} aria-hidden>
        SHB
      </div>
      {items.map((entry, index) => {
        const isAi = entry.page === AI_PAGE;
        const showBadge = index === 0 && typeof badge === 'number' && badge > 0;
        const content = (
          <>
            {ICONS[entry.icon]}
            {showBadge && (
              <span className={styles.railBadge} data-testid="rail-badge">
                {badge}
              </span>
            )}
          </>
        );
        const cls = `${styles.railItem} ${isAi ? styles.railAi : ''}`;
        if (isAi) {
          return (
            <button
              key={entry.page}
              type="button"
              className={cls}
              title={entry.label}
              aria-label={entry.label}
              onClick={onOpenAi}
            >
              {content}
            </button>
          );
        }
        if (entry.path) {
          return (
            <NavLink
              key={entry.page}
              to={entry.path}
              className={({ isActive }) => `${cls} ${isActive ? styles.railActive : ''}`}
              title={entry.label}
              aria-label={entry.label}
            >
              {content}
            </NavLink>
          );
        }
        return (
          <Tooltip key={entry.page} title={`${entry.label}: sẽ có ở đợt sau`}>
            <button type="button" className={cls} aria-label={entry.label} aria-disabled="true" onClick={() => void message.info(`${entry.label}: sẽ có ở đợt sau`)}>
              {content}
            </button>
          </Tooltip>
        );
      })}
    </nav>
  );
}
