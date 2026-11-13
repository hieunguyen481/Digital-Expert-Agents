import { useMemo } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Skeleton } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { uiRoleFromRoles } from '@/auth/roleFromMe';
import { RequireRole } from '@/auth/RequireRole';
import { useMe } from '@/auth/session';
import { EmptyState } from '@/components/common/EmptyState';
import { PageError } from '@/components/common/PageError';
import { useAiPanel } from '@/features/ai-panel/AiPanelContext';
import { PageHead } from '@/features/shell/PageHead';
import { QueueTable } from './QueueTable';
import { SideBlock } from './SideBlock';
import styles from './my-work.module.css';
import { EMPTY_COPY, PAGE_TITLE, QUEUE_TITLE, WORK_ROLES } from './roleCopy';
import { isNameless } from './format';
import { QUEUE_FILTERS, type QueueFilter, type WorkItem, type WorkTag } from './types';
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

  const readOnly = role === 'kiemtoan';
  const rawAll = useWorkItems('all');
  const rawFiltered = useWorkItems(filter);
  // Kiểm toán không cần thấy hồ sơ chưa có khách (nháp do thử nghiệm tạo ra): ẩn khỏi danh sách mặc định.
  const visible = <T extends { items: WorkItem[] } | undefined>(d: T): T =>
    (readOnly && d ? { ...d, items: d.items.filter((i) => !isNameless(i)) } : d) as T;
  const all = useMemo(() => ({ ...rawAll, data: visible(rawAll.data) }), [rawAll.data, readOnly]); // eslint-disable-line react-hooks/exhaustive-deps
  const filtered = useMemo(() => ({ ...rawFiltered, data: visible(rawFiltered.data) }), [rawFiltered.data, readOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const setFilter = (next: QueueFilter) =>
    navigate({ pathname: location.pathname, hash: next === 'all' ? '' : `#filter=${next}` }, { replace: true });

  // Một nguồn đếm cho phụ đề, thẻ tóm tắt và bộ lọc: các thẻ gắn trên chính danh sách đang hiện.
  const tagCount = (tag: WorkTag) => all.data?.items.filter((i) => i.tags.includes(tag)).length ?? 0;
  const facts = all.data
    ? [
        tagCount('over') > 0 && `${tagCount('over')} quá hạn`,
        tagCount('ret') > 0 && `${tagCount('ret')} bị trả lại`,
        tagCount('bosung') > 0 && `${tagCount('bosung')} chờ bổ sung`,
      ]
    : [];

  const actions = readOnly ? null : role === 'qhkh' ? (
    <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/de-xuat-vay')}>
      Tạo đề xuất vay
    </Button>
  ) : null;

  const head = (
    <PageHead
      title={PAGE_TITLE[role]}
      facts={facts}
      actions={actions}
      askLabel="Hỏi trợ lý"
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

  const mine = all.data.items.filter((i) => i.mine);
  const counts: Record<QueueFilter, number> = {
    all: all.data.items.length,
    over: all.data.items.filter((i) => i.tags.includes('over')).length,
    ret: all.data.items.filter((i) => i.tags.includes('ret')).length,
    bosung: all.data.items.filter((i) => i.tags.includes('bosung')).length,
    new: all.data.items.filter((i) => i.tags.includes('new')).length,
  };
  const strip = [
    { label: readOnly || role === 'truongphong' ? 'Hồ sơ đang mở' : 'Cần bạn xử lý', value: readOnly || role === 'truongphong' ? all.data.items.length : mine.length },
    { label: 'Hạn hôm nay', value: all.data.items.filter((i) => i.sla_level === 'today').length },
    { label: 'Hồ sơ quá hạn', value: counts.over },
    role === 'truongphong'
      ? { label: 'Chưa giao người', value: all.data.items.filter((i) => !i.holder_name).length }
      : readOnly ? { label: 'Có cờ cao', value: all.data.items.filter((i) => i.high_flags > 0).length }
      : { label: 'Đang chờ người khác', value: all.data.items.filter((i) => !i.mine).length },
  ];
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
            description={EMPTY_COPY[role]}
          />
        ) : (
          <>
            <div className={styles.strip} role="group" aria-label="Tóm tắt">
              {strip.map((k, i) => (
                <div key={k.label} className={styles.kpi} data-primary={i === 0 && !readOnly ? '' : undefined}>
                  <span className={styles.kpiValue}>{k.value}</span>
                  <span className={styles.kpiLabel}>{k.label}</span>
                </div>
              ))}
            </div>
            {mine.length === 0 && !readOnly && role !== 'truongphong' && (
              <EmptyState title="Không có việc đang chờ bạn" description="Các hồ sơ bên dưới chỉ để theo dõi." compact />
            )}
            <div className={styles.cols}>
              <QueueTable
                readOnly={readOnly}
                title={QUEUE_TITLE[role]}
                items={filtered.data?.items ?? []}
                counts={counts}
                filter={filter}
                onFilter={setFilter}
                loading={filtered.isLoading}
                hasAi
                showHolder={role === 'truongphong'}
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
