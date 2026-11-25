import { LoanCode, loanCodeLabel } from '@/components/common/CodeText';
import { CommentOutlined } from '@ant-design/icons';
import { Button, Segmented, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link, useNavigate } from 'react-router-dom';
import { Flag, StateBlock, StatusPill, ledgerNum, ledgerTable } from '@/components/ui';
import { useAiPanel } from '@/features/ai-panel/AiPanelContext';
import { customerLabel, formatBillion, statusLabel, stepLabel } from './format';
import { DeadlineChip, isEndedStatus } from './DeadlineChip';
import styles from './my-work.module.css';
import { QUEUE_FILTERS, type QueueFilter, type WorkItem } from './types';

interface QueueTableProps {
  title: string;
  items: WorkItem[];
  filter: QueueFilter;
  onFilter: (filter: QueueFilter) => void;
  loading?: boolean;
  /** Số hồ sơ theo từng bộ lọc, tính từ danh sách đầy đủ. */
  counts?: Record<QueueFilter, number>;
  hasAi: boolean;
  showHolder?: boolean;
  /** Vai chỉ đọc: nút dòng là "Xem". */
  readOnly?: boolean;
}


function dueDate(item: WorkItem): string | null {
  return item.due_at ? new Intl.DateTimeFormat('vi-VN').format(new Date(item.due_at)) : null;
}

/** Hành động của hàng: sửa đề xuất khi bị trả lại, mở hồ sơ khi tới lượt bạn, theo dõi khi chỉ xem. */
function rowAction(r: WorkItem, readOnly?: boolean): { label: string; to: string } {
  if (readOnly) return { label: 'Xem', to: `/ho-so-vay/${r.loan_application_id}` };
  if (r.step_code === 'RM_REWORK') return { label: 'Sửa đề xuất', to: `/de-xuat-vay/${r.loan_application_id}` };
  return { label: r.mine ? 'Mở hồ sơ' : 'Xem hồ sơ', to: `/ho-so-vay/${r.loan_application_id}` };
}

export function QueueTable({ title, items, filter, onFilter, loading, counts, hasAi, showHolder, readOnly }: QueueTableProps) {
  const { openWith } = useAiPanel();
  const navigate = useNavigate();
  const today = new Date();
  // Chỉ việc kế tiếp (hàng đầu thuộc về bạn) được nhấn mạnh; còn lại cùng một kiểu viền.
  const firstMine = items.find((i) => i.mine)?.loan_application_id;
  const columns: ColumnsType<WorkItem> = [
    {
      title: 'Khách hàng và mã hồ sơ',
      key: 'customer',
      render: (_, r) => (
        <div>
          <div className={styles.name}>
            <Link to={`/ho-so-vay/${r.loan_application_id}`}>{customerLabel(r.customer_name)}</Link>
            {!r.mine && !showHolder && <StatusPill>Theo dõi</StatusPill>}
          </div>
          <div className={styles.id}><LoanCode code={r.application_number} status={r.status} /></div>
        </div>
      ),
    },
    { title: 'Số tiền', key: 'amount', align: 'right', className: ledgerNum, render: (_, r) => formatBillion(r.requested_amount) },
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
    ...(showHolder
      ? [
          {
            title: 'Người giữ',
            key: 'holder',
            render: (_: unknown, r: WorkItem) => r.holder_name ?? <span className={styles.none}>Chưa giao</span>,
          },
        ]
      : []),
    {
      title: 'Cờ',
      key: 'flags',
      render: (_, r) =>
        r.high_flags > 0 ? (
          <Flag level="r">{r.open_flags} cờ · {r.high_flags} cao</Flag>
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
          <DeadlineChip item={r} today={today} />
          {dueDate(r) && !isEndedStatus(r.status) && <div className={styles.sub}>{dueDate(r)}</div>}
          {isEndedStatus(r.status) && <span className={styles.none}>Đã kết thúc</span>}
        </div>
      ),
    },
    {
      title: <span className="sr-only">Hành động</span>,
      key: 'act',
      align: 'right',
      render: (_, r) => {
        const a = rowAction(r, readOnly);
        return (
          <div className={styles.rowAct}>
            <Button size="small" type={r.loan_application_id === firstMine ? 'primary' : 'default'} onClick={() => navigate(a.to)} aria-label={`${a.label} ${loanCodeLabel(r.application_number, r.status)}`}>
              {a.label}
            </Button>
            {hasAi && (
              <Button
                size="small"
                type="text"
                icon={<CommentOutlined />}
                aria-label={`Hỏi trợ lý về ${loanCodeLabel(r.application_number, r.status)}`}
                title="Hỏi trợ lý"
                onClick={() =>
                  openWith({ type: 'case', id: r.loan_application_id, label: `${loanCodeLabel(r.application_number, r.status)} · ${customerLabel(r.customer_name)}` })
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
          options={QUEUE_FILTERS.map((f) => ({ value: f.key, label: counts ? `${f.label} ${counts[f.key]}` : f.label }))}
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
        locale={{
          emptyText: (
            <StateBlock
              kind="empty"
              compact
              title="Không có hồ sơ khớp bộ lọc này"
              description="Thử bỏ bộ lọc để xem toàn bộ hồ sơ của bạn."
              action={filter !== 'all' ? <Button onClick={() => onFilter('all')}>Bỏ lọc</Button> : undefined}
            />
          ),
        }}
      />
    </section>
  );
}
