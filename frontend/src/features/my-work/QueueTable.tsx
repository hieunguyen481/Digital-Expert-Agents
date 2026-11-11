import { ThunderboltOutlined } from '@ant-design/icons';
import { Button, Segmented, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link, useNavigate } from 'react-router-dom';
import { Flag, StatusPill, ledgerNum, ledgerTable, type PillTone } from '@/components/ui';
import { useAiPanel } from '@/features/ai-panel/AiPanelContext';
import { formatBillion, slaText, statusLabel, stepLabel } from './format';
import styles from './my-work.module.css';
import { QUEUE_FILTERS, type QueueFilter, type SlaLevel, type WorkItem } from './types';

interface QueueTableProps {
  title: string;
  items: WorkItem[];
  filter: QueueFilter;
  onFilter: (filter: QueueFilter) => void;
  loading?: boolean;
  hasAi: boolean;
}

const SLA_TONE: Record<SlaLevel, PillTone> = { over: 'bad', today: 'warn', soon: 'info', ok: 'info', pause: 'neutral', none: 'neutral' };

function dueDate(item: WorkItem): string | null {
  return item.due_at ? new Intl.DateTimeFormat('vi-VN').format(new Date(item.due_at)) : null;
}

/** Hành động của hàng: sửa đề xuất khi bị trả lại, mở hồ sơ khi tới lượt bạn, theo dõi khi chỉ xem. */
function rowAction(r: WorkItem): { label: string; to: string } {
  if (r.step_code === 'RM_REWORK') return { label: 'Sửa đề xuất', to: `/de-xuat-vay/${r.loan_application_id}` };
  return { label: r.mine ? 'Mở hồ sơ' : 'Xem hồ sơ', to: `/ho-so-vay/${r.loan_application_id}` };
}

export function QueueTable({ title, items, filter, onFilter, loading, hasAi }: QueueTableProps) {
  const { openWith } = useAiPanel();
  const navigate = useNavigate();
  const today = new Date();
  const columns: ColumnsType<WorkItem> = [
    {
      title: 'Khách hàng và mã hồ sơ',
      key: 'customer',
      render: (_, r) => (
        <div>
          <div className={styles.name}>
            <Link to={`/ho-so-vay/${r.loan_application_id}`}>{r.customer_name}</Link>
            {!r.mine && <StatusPill>Theo dõi</StatusPill>}
          </div>
          <div className={styles.id}>{r.application_number}</div>
        </div>
      ),
    },
    { title: 'Số tiền', key: 'amount', className: ledgerNum, render: (_, r) => formatBillion(r.requested_amount) },
    {
      title: 'Bước hiện tại',
      key: 'step',
      render: (_, r) => (
        <div>
          {stepLabel(r.step_code)}
          <div className={styles.sub}>
            {statusLabel(r.status)}
            {r.mine && r.fields_to_confirm > 0 && ` · Xác nhận ${r.fields_to_confirm} số liệu`}
          </div>
        </div>
      ),
    },
    {
      title: 'Cờ',
      key: 'flags',
      render: (_, r) =>
        r.high_flags > 0 ? (
          <Flag level="r">{r.open_flags} cờ, {r.high_flags} Cao</Flag>
        ) : r.open_flags > 0 ? (
          <Flag level="y">{r.open_flags} cờ</Flag>
        ) : (
          <span className={styles.none}>Không có</span>
        ),
    },
    {
      title: 'Hạn xử lý',
      key: 'sla',
      render: (_, r) => (
        <div>
          <StatusPill tone={SLA_TONE[r.sla_level]}>{slaText(r, today)}</StatusPill>
          {dueDate(r) && <div className={styles.sub}>{dueDate(r)}</div>}
        </div>
      ),
    },
    {
      title: <span className="sr-only">Hành động</span>,
      key: 'act',
      align: 'right',
      render: (_, r) => {
        const a = rowAction(r);
        return (
          <div className={styles.rowAct}>
            <Button size="small" type={r.mine ? 'primary' : 'default'} onClick={() => navigate(a.to)} aria-label={`${a.label} ${r.application_number}`}>
              {a.label}
            </Button>
            {hasAi && (
              <Button
                size="small"
                type="text"
                icon={<ThunderboltOutlined />}
                aria-label={`Hỏi AI về ${r.application_number}`}
                title="Hỏi AI"
                onClick={() =>
                  openWith({ type: 'case', id: r.loan_application_id, label: `${r.application_number} · ${r.customer_name}` })
                }
              />
            )}
          </div>
        );
      },
    },
  ];
  return (
    <section className={styles.queue} aria-label={title}>
      <div className={styles.queueHead}>
        <h2>{title}</h2>
        <Segmented
          value={filter}
          onChange={(v) => onFilter(v as QueueFilter)}
          options={QUEUE_FILTERS.map((f) => ({ value: f.key, label: f.label }))}
          aria-label="Lọc danh sách"
        />
      </div>
      <Table<WorkItem>
        rowKey="loan_application_id"
        size="middle"
        className={ledgerTable}
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
