import { SwapOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Select } from 'antd';
import { useState } from 'react';
import { endDemoSession, getDemoSession, startDemoSession } from '@/auth/keycloak';
import { UI_ROLE_LABEL } from '@/auth/roleFromMe';
import { normalizeError } from '@/services/apiClient';
import { getDemoAccounts, switchDemoAccount } from '@/services/demoService';
import { uiRoleFromRoles } from '@/auth/roleFromMe';

function roleLabel(roles: string[]): string {
  const role = uiRoleFromRoles(roles);
  return role ? UI_ROLE_LABEL[role] : roles.join(', ');
}

/** Dải báo khi đang đóng vai tài khoản khác; chỉ hiện trong phiên demo. */
export function DemoBanner() {
  const demo = getDemoSession();
  if (!demo) return null;
  return (
    <div role="status" data-testid="demo-banner" style={{ background: '#fff7e6', borderBottom: '1px solid #ffd591', padding: '6px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
      <span>Đang demo với vai <b data-testid="demo-banner-role">{roleLabel(demo.roles)}</b> — {demo.fullName} ({demo.email})</span>
      <Button size="small" data-testid="demo-exit" onClick={endDemoSession}>Quay về Quản trị</Button>
    </div>
  );
}

/** Danh sách thả xuống của Quản trị để đổi sang tài khoản seed khác; chế độ demo tắt (404) thì không hiện gì. */
export function DemoSwitcher() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const accounts = useQuery({ queryKey: ['demo-accounts'], queryFn: getDemoAccounts, retry: false, staleTime: 5 * 60 * 1000 });
  if (!accounts.data) return null;

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
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <SwapOutlined aria-hidden />
      <Select
        data-testid="demo-switcher"
        aria-label="Đổi tài khoản demo"
        placeholder="Đổi tài khoản demo"
        style={{ width: 280 }}
        loading={busy}
        disabled={busy}
        optionLabelProp="label"
        onChange={(email: string) => void choose(email)}
        options={accounts.data.map((a) => ({
          value: a.email,
          label: a.full_name,
          title: `${a.full_name} · ${roleLabel(a.roles)} · ${a.email}`,
          text: `${a.full_name} · ${roleLabel(a.roles)} · ${a.email}`,
        }))}
        optionRender={(o) => <span data-testid="demo-option">{(o.data as { text: string }).text}</span>}
      />
      {error && <Alert type="error" showIcon message={error} />}
    </span>
  );
}
