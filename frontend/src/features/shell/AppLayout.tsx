import { Outlet, useLocation } from 'react-router-dom';
import { uiRoleFromRoles } from '@/auth/roleFromMe';
import { useMe } from '@/auth/session';
import { getAuthenticatedClaims, getDemoSession } from '@/auth/keycloak';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { SHBLogo } from '@/components/common/SHBLogo';
import { PageError } from '@/components/common/PageError';
import { AiPanel } from '@/features/ai-panel/AiPanel';
import { AiPanelProvider, useAiPanel } from '@/features/ai-panel/AiPanelContext';
import { useAiShortcut } from '@/features/ai-panel/useAiShortcut';
import { useWorkItems } from '@/features/my-work/useWorkItems';
import { DemoStrip } from './DemoSwitcher';
import { NoAccess } from './NoAccess';
import { pageWidthFor, roleHasAi } from './navigation';
import { Rail } from './Rail';
import { Topbar } from './Topbar';
import styles from './shell.module.css';

function Frame({ me, role }: { me: NonNullable<ReturnType<typeof useMe>['data']>; role: NonNullable<ReturnType<typeof uiRoleFromRoles>> }) {
  const { open, openWith } = useAiPanel();
  useAiShortcut();
  const { pathname } = useLocation();
  const width = pageWidthFor(pathname);
  const hasAi = roleHasAi(role);
  const work = useWorkItems('all', role !== 'quantri');
  return (
    <div className={`${styles.layout} ${open ? styles.layoutAiOpen : ''}`}>
      <a href="#main-content" className={styles.skip}>Bỏ qua điều hướng</a>
      <DemoStrip isAdmin={me.roles.includes('admin')} />
      <Rail role={role} badge={role === 'quantri' ? undefined : work.data?.badge} onOpenAi={() => openWith()} />
      <div className={styles.mainCol}>
        <Topbar me={me} role={role} width={width} />
        <main id="main-content" tabIndex={-1} className={styles.content}>
          <div className={width === 'narrow' ? styles.pageNarrow : width === 'full' ? styles.pageFull : styles.pageWide}>
            <Outlet />
          </div>
        </main>
      </div>
      {hasAi && <AiPanel />}
    </div>
  );
}

/** Layout route: rail, topbar, vùng nội dung và panel Trợ lý AI. */
export function AppLayout() {
  const me = useMe();
  if (me.isError) {
    return <PageError title="Không tải được hồ sơ người dùng" error={me.error} onRetry={() => void me.refetch()} />;
  }
  if (!me.data) {
    // Khung ứng dụng hiện ngay lúc tải đầu: menu theo vai trong token, thanh trên và khung xương ở vùng nội dung.
    const early = uiRoleFromRoles(getDemoSession()?.roles ?? (getAuthenticatedClaims()?.realm_access?.roles ?? []));
    return (
      <div className={`${styles.layout} ${styles.layoutLoading}`} aria-busy data-testid="shell-loading">
        {early ? (
          <Rail role={early} onOpenAi={() => undefined} />
        ) : (
          <div className={styles.side} style={{ gridRow: '1 / -1' }}>
            <div className={styles.brand}>
              <SHBLogo variant="white" showProductName />
            </div>
          </div>
        )}
        <div className={styles.mainCol}>
          <div className={styles.topbar}>
            <div className={styles.topbarIn}><div className={styles.search} aria-hidden /></div>
          </div>
          <main id="main-content" className={styles.content}>
            <div className={styles.pageWide}>
              <PageSkeleton />
            </div>
          </main>
        </div>
      </div>
    );
  }
  const role = uiRoleFromRoles(me.data.roles);
  if (!role) return <NoAccess role={null} />;
  return (
    <AiPanelProvider enabled={roleHasAi(role)}>
      <Frame me={me.data} role={role} />
    </AiPanelProvider>
  );
}
