import { StatusPill } from '@/components/ui';
import { slaText, workdaysBetween } from './format';
import type { WorkItem } from './types';

const ENDED = new Set(['APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED', 'WITHDRAWN']);
/** Hồ sơ đã kết thúc thì không còn hạn xử lý. */
export const isEndedStatus = (status: string): boolean => ENDED.has(status);

/** Một chip hạn cho mọi danh sách: quá hạn đỏ, còn ≤ 1 ngày làm việc vàng, còn lại xám (xanh lá nghĩa là "Đạt" nên không dùng). */
export function DeadlineChip({ item, today = new Date(), prefix }: { item: WorkItem; today?: Date; prefix?: string }) {
  if (isEndedStatus(item.status)) return null;
  if (!item.due_at && !item.paused) return <StatusPill tone="neutral">Chưa có hạn</StatusPill>;
  const paused = item.paused || item.sla_level === 'pause';
  const n = item.due_at ? workdaysBetween(today, new Date(item.due_at)) : 0;
  const tone = paused ? 'neutral' : n < 0 || item.sla_level === 'over' ? 'bad' : n <= 1 ? 'warn' : 'neutral';
  const text = slaText({ ...item, sla_level: paused ? 'pause' : n < 0 ? 'over' : n === 0 ? 'today' : 'ok' }, today);
  return <StatusPill tone={tone}>{prefix ? `${prefix} · ${text}` : text}</StatusPill>;
}
