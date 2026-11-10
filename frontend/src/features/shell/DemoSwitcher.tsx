import { DownOutlined, SwapOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Button } from 'antd';
import { endDemoSession, getDemoSession, startDemoSession } from '@/auth/keycloak';
import { UI_ROLE_LABEL, uiRoleFromRoles } from '@/auth/roleFromMe';
import { normalizeError } from '@/services/apiClient';
import { getDemoAccounts, switchDemoAccount } from '@/services/demoService';
import styles from './shell.module.css';

function roleLabel(roles: string[]): string {
  const role = uiRoleFromRoles(roles);
  return role ? UI_ROLE_LABEL[role] : roles.join(', ');
}

function DemoMenu({ accounts, onClose }: { accounts: Array<{ email: string; full_name: string; roles: string[] }>; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('button')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const choose = async (email: string) => {
    setBusy(true);
    setError(null);
    try {
      const token = await switchDemoAccount(email);
      startDemoSession({
        accessToken: token.access_token,
        expiresAt: Date.now() + token.expires_in * 1000,
        email: token.account.email,
        fullName: token.account.full_name,
        roles: token.account.roles,
      });
    } catch (e) {
      setError(normalizeError(e).message);
      setBusy(false);
    }
  };

  return (
    <div className={styles.demoMenu} ref={ref} role="menu" aria-label="Đổi tài khoản demo">
      <div className={styles.demoMenuHead}>Đổi sang tài khoản demo khác (dữ liệu và quyền đổi theo vai)</div>
      {accounts.map((a) => (
        <button
          key={a.email}
          type="button"
          role="menuitem"
          className={styles.demoOption}
          disabled={busy}
          data-testid="demo-option"
          title={`${a.full_name} · ${roleLabel(a.roles)} · ${a.email}`}
          onClick={() => void choose(a.email)}
        >
          <span>{`${a.full_name} · ${roleLabel(a.roles)} · ${a.email}`}</span>
        </button>
      ))}
      {error && <div className={styles.demoErr} role="alert">{error}</div>}
    </div>
  );
}

/**
 * Dải chế độ demo (mockup 23): hiện khi đang đóng vai tài khoản khác, hoặc khi Quản trị có thể đổi
 * tài khoản. Chế độ demo tắt (backend 404) thì không hiện gì.
 */
export function DemoStrip({ isAdmin }: { isAdmin: boolean }) {
  const demo = getDemoSession();
  const [open, setOpen] = useState(false);
  const accounts = useQuery({
    queryKey: ['demo-accounts'],
    queryFn: getDemoAccounts,
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled: isAdmin && !demo,
  });
  if (demo) {
    return (
      <div role="status" data-testid="demo-banner" className={`${styles.demo} ${styles.demoRow}`}>
        <span>
          Chế độ demo · Đang demo với vai <b data-testid="demo-banner-role">{roleLabel(demo.roles)}</b> — {demo.fullName} ({demo.email})
        </span>
        <span className={styles.demoSw}>
          <Button size="small" data-testid="demo-exit" onClick={endDemoSession}>
            Quay về Quản trị
          </Button>
        </span>
      </div>
    );
  }
  if (!accounts.data) return null;
  return (
    <div className={`${styles.demo} ${styles.demoRow}`}>
      <span>
        <b>Chế độ demo</b> · Bạn đang đăng nhập bằng tài khoản Quản trị
      </span>
      <span className={styles.demoSw}>
        <button
          type="button"
          className={styles.demoBtn}
          data-testid="demo-switcher"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <SwapOutlined aria-hidden /> Đổi tài khoản demo <DownOutlined aria-hidden style={{ fontSize: 10 }} />
        </button>
      </span>
      {open && <DemoMenu accounts={accounts.data} onClose={() => setOpen(false)} />}
    </div>
  );
}
