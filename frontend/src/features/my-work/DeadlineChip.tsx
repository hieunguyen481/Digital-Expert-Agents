import { StatusPill } from '@/components/ui';
import { deadlineClass, slaText, workdaysBetween } from './format';
import type { WorkItem } from './types';

const ENDED = new Set(['APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED', 'WITHDRAWN']);
/** Hồ sơ đã kết thúc thì không còn hạn xử lý. */
export const isEndedStatus = (status: string): boolean => ENDED.has(status);

/** Một chip hạn cho mọi danh sách: quá hạn đỏ, còn ≤ 1 ngày làm việc vàng, còn lại xám (xanh lá nghĩa là "Đạt" nên không dùng). */
export function DeadlineChip({ item, today = new Date(), prefix }: { item: WorkItem; today?: Date; prefix?: string }) {
  if (isEndedStatus(item.status)) return null;
  if (!item.due_at && !item.paused) return <StatusPill tone="neutral">Chưa có hạn</StatusPill>;
  const c = deadlineClass(item, today);
  const tone = c === 'over' ? 'bad' : c === 'today' || (c === 'ok' && workdaysBetween(today, new Date(item.due_at!)) <= 1) ? 'warn' : 'neutral';
  const text = slaText(item, today);
  return <StatusPill tone={tone} outlined={tone === 'bad'}>{prefix ? `${prefix} · ${text}` : text}</StatusPill>;
}
