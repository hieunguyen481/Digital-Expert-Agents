import { LockOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Skeleton, Tooltip } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { uiRoleFromRoles } from '@/auth/roleFromMe';
import { RequireRole } from '@/auth/RequireRole';
import { useMe } from '@/auth/session';
import { EmptyState } from '@/components/common/EmptyState';
import { PageError } from '@/components/common/PageError';
import { useAiPanel } from '@/features/ai-panel/AiPanelContext';
import { PageHead } from '@/features/shell/PageHead';
import { Hero } from './Hero';
import { QueueTable } from './QueueTable';
import { SideBlock } from './SideBlock';
import styles from './my-work.module.css';
import { PAGE_TITLE, QUEUE_TITLE, WORK_ROLES } from './roleCopy';
import { QUEUE_FILTERS, type QueueFilter } from './types';
import { useWorkItems } from './useWorkItems';

function filterFromHash(hash: string): QueueFilter {
  const value = new URLSearchParams(hash.replace(/^#/, '')).get('filter');
  return QUEUE_FILTERS.some((f) => f.key === value) ? (value as QueueFilter) : 'all';
}

function Content() {
  const me = useMe().data!;
  const role = uiRoleFromRoles(me.roles)!;
  const location = useLocation();
  const navigate = useNavigate();
  const { openWith } = useAiPanel();
  const filter = filterFromHash(location.hash);

  const all = useWorkItems('all');
  const filtered = useWorkItems(filter);
  const readOnly = role === 'kiemtoan';

  const setFilter = (next: QueueFilter) =>
    navigate({ pathname: location.pathname, hash: next === 'all' ? '' : `#filter=${next}` }, { replace: true });

  const facts = all.data
    ? [
        all.data.facts.overdue > 0 && `${all.data.facts.overdue} quá hạn`,
        all.data.facts.due_within_1_workday > 0 && `${all.data.facts.due_within_1_workday} đến hạn trong 1 ngày LV`,
        all.data.facts.returned > 0 && `${all.data.facts.returned} bị trả lại`,
        all.data.facts.waiting_supplement > 0 && `${all.data.facts.waiting_supplement} chờ bổ sung`,
      ]
    : [];

  const actions = readOnly ? (
    <Tooltip title="Kiểm toán nội bộ chỉ xem, không thao tác">
      <span>
        <Button icon={<LockOutlined />} disabled>
          Chỉ đọc
        </Button>
      </span>
    </Tooltip>
  ) : role === 'qhkh' ? (
    <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/de-xuat-vay')}>
      Tạo đề xuất vay
    </Button>
  ) : null;

  const head = (
    <PageHead
      title={PAGE_TITLE[role]}
      facts={facts}
      actions={actions}
      onAskAi={() => openWith({ type: 'session', id: 'my-work', label: PAGE_TITLE[role] })}
    />
  );

  if (all.isError) {
    return (
      <>
        {head}
        <PageError title="Không tải được danh sách hồ sơ" error={all.error} onRetry={() => void all.refetch()} />
      </>
    );
  }
  if (!all.data) {
    return (
      <>
        {head}
        <div className={styles.page} aria-busy>
          <Skeleton active />
        </div>
      </>
    );
  }

  const firstMine = all.data.items[0]?.mine ? all.data.items[0] : null;
  return (
    <>
      {head}
      <div className={styles.page}>
        {readOnly && (
          <Alert type="info" showIcon title="Bạn đang xem ở chế độ chỉ đọc (Kiểm toán nội bộ)." />
        )}
        {all.data.items.length === 0 ? (
          <EmptyState
            title="Không có việc đang chờ bạn"
            description="0 hồ sơ đang chờ bạn. Khi có hồ sơ chuyển tới bước của bạn, hồ sơ sẽ hiện ở đây và tăng số trên thanh trái."
          />
        ) : (
          <>
            {firstMine && !readOnly && <Hero item={firstMine} />}
            {!firstMine && !readOnly && (
              <EmptyState title="Không có việc đang chờ bạn" description="Các hồ sơ bên dưới chỉ để theo dõi." compact />
            )}
            <div className={styles.cols}>
              <QueueTable
                title={QUEUE_TITLE[role]}
                items={filtered.data?.items ?? []}
                filter={filter}
                onFilter={setFilter}
                loading={filtered.isLoading}
                hasAi
              />
              <SideBlock role={role} me={me} items={all.data.items} />
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default function MyWorkPage() {
  return (
    <RequireRole allow={WORK_ROLES} pageName="Việc của tôi">
      <Content />
    </RequireRole>
  );
}
