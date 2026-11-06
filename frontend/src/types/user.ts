/**
 * Người dùng của ứng dụng là NHÂN VIÊN NGÂN HÀNG (nội bộ), không phải khách hàng.
 * Hồ sơ lấy từ GET /me (xem `auth/session.ts`), vai trò hiển thị là `UiRole`.
 */
import type { UiRole } from '@/auth/roleFromMe';

export interface UserProfile {
  id: string;
  displayName: string;
  role: UiRole | null;
  branch: string;
  avatarUrl?: string;
}
