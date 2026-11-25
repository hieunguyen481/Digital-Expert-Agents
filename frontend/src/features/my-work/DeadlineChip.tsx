import { StatusPill, StatusText } from '@/components/ui';
import { deadlineClass, slaText, workdaysBetween } from './format';
import type { WorkItem } from './types';

const ENDED = new Set(['APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED', 'WITHDRAWN']);
/** Hồ sơ đã kết thúc thì không còn hạn xử lý. */
export const isEndedStatus = (status: string): boolean => ENDED.has(status);

/** Hạn xử lý cho mọi danh sách: quá hạn là nhãn đỏ; còn ≤ 1 ngày làm việc chữ vàng đậm; còn lại chữ thường (xanh lá nghĩa là "Đạt" nên không dùng). */
export function DeadlineChip({ item, today = new Date(), prefix }: { item: WorkItem; today?: Date; prefix?: string }) {
  if (isEndedStatus(item.status)) return null;
  if (!item.due_at && !item.paused) return <StatusText>Chưa có hạn</StatusText>;
  const c = deadlineClass(item, today);
  const tone = c === 'over' ? 'bad' : c === 'today' || (c === 'ok' && workdaysBetween(today, new Date(item.due_at!)) <= 1) ? 'warn' : 'neutral';
  const text = slaText(item, today);
  const label = prefix ? `${prefix} · ${text}` : text;
  if (tone === 'bad') return <StatusPill tone="bad" outlined>{label}</StatusPill>;
  return <StatusText warn={tone === 'warn'}>{label}</StatusText>;
}
