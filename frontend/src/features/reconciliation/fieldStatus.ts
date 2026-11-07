import type { ReconField } from './types';

export interface StatusLabel {
  text: string;
  color: 'purple' | 'orange' | 'green' | 'default';
}

/** Nhãn theo nguyên tắc "AI chỉ đề xuất": giá trị do AI điền luôn mang nhãn cho đến khi người xác nhận. */
export function fieldStatusLabel(f: Pick<ReconField, 'verification_status' | 'verified_by_name'>): StatusLabel {
  switch (f.verification_status) {
    case 'AI_PROPOSED':
      return { text: 'AI đề xuất', color: 'purple' };
    case 'NEEDS_VERIFICATION':
      return { text: 'Cần xác minh', color: 'orange' };
    case 'CONFIRMED':
      return { text: f.verified_by_name ? `Đã xác nhận bởi ${f.verified_by_name}` : 'Đã xác nhận', color: 'green' };
    default:
      return { text: f.verification_status, color: 'default' };
  }
}

export const needsHuman = (f: Pick<ReconField, 'verification_status'>) =>
  f.verification_status === 'AI_PROPOSED' || f.verification_status === 'NEEDS_VERIFICATION';

export function highlightStyle(f: ReconField): { left: string; top: string; width: string; height: string } | null {
  const b = f.bounding_box;
  if (!b) return null;
  const pct = (n: number) => `${(n * 100).toFixed(2)}%`;
  return { left: pct(b.x), top: pct(b.y), width: pct(b.w), height: pct(b.h) };
}
