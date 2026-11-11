import { Skeleton } from 'antd';
import { Outlet, useLocation } from 'react-router-dom';
import { uiRoleFromRoles } from '@/auth/roleFromMe';
import { useMe } from '@/auth/session';
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
        <Topbar me={me} role={role} />
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
    // Khung ứng dụng và logo hiện ngay lúc tải đầu, nội dung là khung chờ.
    return (
      <div className={styles.layout} aria-busy>
        <nav className={styles.side} aria-label="Điều hướng chính">
          <div className={styles.brand}>
            <SHBLogo variant="white" showProductName />
          </div>
        </nav>
        <div className={styles.mainCol}>
          <div className={styles.topbar} />
          <main id="main-content" className={styles.content}>
            <div className={styles.skeletonWrap}>
              <h1 className="sr-only">Đang tải</h1>
              <Skeleton active />
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
