import { ThunderboltOutlined } from '@ant-design/icons';
import { Button, Segmented, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAiPanel } from '@/features/ai-panel/AiPanelContext';
import { formatBillion, slaText, statusLabel, stepLabel } from './format';
import styles from './my-work.module.css';
import { QUEUE_FILTERS, type QueueFilter, type WorkItem } from './types';

interface QueueTableProps {
  title: string;
  items: WorkItem[];
  filter: QueueFilter;
  onFilter: (filter: QueueFilter) => void;
  loading?: boolean;
  hasAi: boolean;
}

export function QueueTable({ title, items, filter, onFilter, loading, hasAi }: QueueTableProps) {
  const { openWith } = useAiPanel();
  const today = new Date();
  const columns: ColumnsType<WorkItem> = [
    {
      title: 'Khách hàng & mã hồ sơ',
      key: 'customer',
      render: (_, r) => (
        <div>
          <b>{r.customer_name}</b>
          {!r.mine && <Tag className={styles.watchTag}>Theo dõi</Tag>}
          <div className={styles.sub}>{r.application_number}</div>
        </div>
      ),
    },
    { title: 'Số tiền', key: 'amount', render: (_, r) => formatBillion(r.requested_amount) },
    {
      title: 'Bước',
      key: 'step',
      render: (_, r) => (
        <div>
          {stepLabel(r.step_code)}
          <div className={styles.sub}>{statusLabel(r.status)}</div>
        </div>
      ),
    },
    { title: 'Hạn SLA', key: 'sla', render: (_, r) => <span className={styles.sla}>{slaText(r, today)}</span> },
    {
      title: 'Việc của tôi',
      key: 'mine',
      render: (_, r) => (r.mine ? 'Cần xử lý' : '—'),
    },
  ];
  if (hasAi) {
    columns.push({
      title: '',
      key: 'ai',
      width: 56,
      render: (_, r) => (
        <Button
          type="text"
          icon={<ThunderboltOutlined />}
          aria-label={`Hỏi AI về ${r.application_number}`}
          title="Hỏi AI"
          onClick={() =>
            openWith({ type: 'case', id: r.loan_application_id, label: `${r.application_number} · ${r.customer_name}` })
          }
        />
      ),
    });
  }
  return (
    <section className={styles.queue} aria-label={title}>
      <div className={styles.queueHead}>
        <h2>{title}</h2>
        <Segmented
          value={filter}
          onChange={(v) => onFilter(v as QueueFilter)}
          options={QUEUE_FILTERS.map((f) => ({ value: f.key, label: f.label }))}
        />
      </div>
      <Table<WorkItem>
        rowKey="loan_application_id"
        size="middle"
        columns={columns}
        dataSource={items}
        loading={loading}
        pagination={false}
        rowClassName={(r) => (r.mine ? '' : styles.dim)}
        locale={{ emptyText: 'Không có hồ sơ khớp bộ lọc này' }}
      />
    </section>
  );
}
