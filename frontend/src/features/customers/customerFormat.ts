import type { PillTone } from '@/components/ui';

/** Dòng khách hàng từ GET /customers và /customers/:id. */
export interface CustomerRow {
  id?: string | null;
  customer_id?: string | null;
  customer_number: string;
  display_name?: string | null;
  full_name?: string | null;
  customer_segment?: string | null;
  kyc_status: string;
  risk_rating?: string | null;
  status: string;
  updated_at: string;
}

export const customerId = (c: CustomerRow): string | null => c.id ?? c.customer_id ?? null;
export const customerName = (c: CustomerRow): string => c.display_name ?? c.full_name ?? c.customer_number;

const KYC: Record<string, [string, PillTone]> = {
  VERIFIED: ['Đã xác minh', 'ok'],
  PENDING: ['Chờ xác minh', 'warn'],
  PENDING_INFO: ['Chờ bổ sung', 'warn'],
  PENDING_REVIEW: ['Chờ rà soát', 'warn'],
  EXPIRED: ['Hết hạn', 'bad'],
};
const RISK: Record<string, [string, PillTone]> = {
  LOW: ['Thấp', 'ok'],
  MEDIUM: ['Trung bình', 'warn'],
  HIGH: ['Cao', 'bad'],
};
const SEGMENT: Record<string, string> = { SME: 'Doanh nghiệp vừa và nhỏ' };
const STATUS: Record<string, string> = { ACTIVE: 'Đang hoạt động', INACTIVE: 'Ngừng hoạt động', CLOSED: 'Đã đóng' };

export const kycInfo = (v: string): [string, PillTone] => KYC[v] ?? ['Chưa rõ', 'neutral'];
export const riskInfo = (v: string | null | undefined): [string, PillTone] | null => (v ? RISK[v] ?? null : null);
export const segmentLabel = (v: string | null | undefined): string | null => (v ? SEGMENT[v] ?? 'Khác' : null);
export const customerStatusLabel = (v: string): string => STATUS[v] ?? 'Chưa rõ';
