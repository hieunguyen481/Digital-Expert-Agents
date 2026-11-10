import { Skeleton } from 'antd';
import { Outlet } from 'react-router-dom';
import { uiRoleFromRoles } from '@/auth/roleFromMe';
import { useMe } from '@/auth/session';
import { PageError } from '@/components/common/PageError';
import { AiPanel } from '@/features/ai-panel/AiPanel';
import { AiPanelProvider, useAiPanel } from '@/features/ai-panel/AiPanelContext';
import { useAiShortcut } from '@/features/ai-panel/useAiShortcut';
import { useWorkItems } from '@/features/my-work/useWorkItems';
import { NoAccess } from './NoAccess';
import { roleHasAi } from './navigation';
import { Rail } from './Rail';
import { Topbar } from './Topbar';
import styles from './shell.module.css';

function Frame({ me, role }: { me: NonNullable<ReturnType<typeof useMe>['data']>; role: NonNullable<ReturnType<typeof uiRoleFromRoles>> }) {
  const { open, openWith } = useAiPanel();
  useAiShortcut();
  const hasAi = roleHasAi(role);
  const work = useWorkItems('all', role !== 'quantri');
  return (
    <div className={`${styles.layout} ${open ? styles.layoutAiOpen : ''}`}>
      <a href="#main-content" className={styles.skip}>Bỏ qua tới nội dung chính</a>
      <Rail role={role} badge={role === 'quantri' ? undefined : work.data?.badge} onOpenAi={() => openWith()} />
      <div className={styles.mainCol}>
        <Topbar me={me} role={role} />
        <main id="main-content" className={styles.content}>
          <Outlet />
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
    return (
      <div className={styles.skeletonWrap} aria-busy>
        <Skeleton active />
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
