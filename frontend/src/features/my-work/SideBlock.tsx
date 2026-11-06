import type { UiRole } from '@/auth/roleFromMe';
import type { Me } from '@/types/me';
import styles from './my-work.module.css';
import type { WorkItem } from './types';

/** Khối phụ chỉ khi có dữ liệu thật; trả null nếu không có gì để hiển thị. */
export function SideBlock({ role, me, items }: { role: UiRole; me: Me; items: WorkItem[] }) {
  if (role === 'tdinh' || role === 'httd') {
    const mine = items.filter((i) => i.mine);
    const fields = mine.reduce((n, i) => n + i.fields_to_confirm, 0);
    const flags = mine.reduce((n, i) => n + i.open_flags, 0);
    if (fields === 0 && flags === 0) return null;
    return (
      <aside className={styles.side} aria-label="Cần xử lý">
        <h3>Cần xử lý</h3>
        {fields > 0 && <p>{fields} số liệu cần xác nhận</p>}
        {flags > 0 && <p>{flags} cờ cảnh báo đang mở</p>}
      </aside>
    );
  }
  if (role === 'pheduyet' && me.approval_tier) {
    const limit = me.approval_tier === 1 ? '20 tỷ' : me.approval_tier === 2 ? '100 tỷ' : null;
    return (
      <aside className={styles.side} aria-label="Thẩm quyền của bạn">
        <h3>Thẩm quyền của bạn</h3>
        <p>
          Cấp {me.approval_tier}
          {limit ? ` · tối đa ${limit}` : ''}
        </p>
      </aside>
    );
  }
  return null;
}
