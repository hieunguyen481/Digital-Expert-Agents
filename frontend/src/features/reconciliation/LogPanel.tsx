import { Table } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { fetchReconLog } from './reconciliationService';
import styles from './reconciliation.module.css';

const fmt = (iso: string) => new Date(iso).toLocaleString('vi-VN');

/** Nhật ký chỉ đọc: backend chỉ cho thêm dòng, không sửa hay xóa. */
export function LogPanel({ loanId }: { loanId: string }) {
  const q = useQuery({ queryKey: ['recon-log', loanId], queryFn: () => fetchReconLog(loanId) });
  const conflicts = q.data?.conflicts ?? [];
  const checks = q.data?.checks ?? [];
  if (conflicts.length + checks.length === 0) return null;
  return (
    <section className={styles.panel} aria-label="Nhật ký đối chiếu">
      <h2>Nhật ký đối chiếu (chỉ ghi thêm)</h2>
      {conflicts.length > 0 && (
        <Table
          size="small" pagination={false} rowKey="log_id" dataSource={conflicts} aria-label="Nhật ký chốt nguồn"
          columns={[
            { title: 'Lúc', render: (_, r) => fmt(r.at) },
            { title: 'Ai', dataIndex: 'actor_name' },
            { title: 'Mâu thuẫn', dataIndex: 'conflict_code' },
            { title: 'Giá trị cũ', render: (_, r) => r.old_value_text ?? '—' },
            { title: 'Giá trị mới', render: (_, r) => r.new_value_text ?? '—' },
            { title: 'Lý do', dataIndex: 'reason' },
          ]}
        />
      )}
      {checks.length > 0 && (
        <Table
          size="small" pagination={false} rowKey="log_id" dataSource={checks} aria-label="Nhật ký hậu kiểm checklist"
          style={{ marginTop: 8 }}
          columns={[
            { title: 'Lúc', render: (_, r) => fmt(r.at) },
            { title: 'Ai', dataIndex: 'actor_name' },
            { title: 'Mục', dataIndex: 'requirement_code' },
            { title: 'Kết quả', render: (_, r) => (r.result === 'PASS' ? 'Đạt' : 'Không đạt') },
            { title: 'Ghi chú', render: (_, r) => r.note ?? '—' },
          ]}
        />
      )}
    </section>
  );
}
