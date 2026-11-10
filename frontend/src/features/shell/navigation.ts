import type { UiRole } from '@/auth/roleFromMe';

/** Mục rail theo design-system §2.1. `page` là số trang trong bộ thiết kế. */
export interface RailItem {
  page: number;
  label: string;
  icon: 'inbox' | 'plus' | 'building' | 'filecheck' | 'users' | 'book' | 'clock' | 'gear' | 'spark' | 'chat' | 'dash';
  /** null: trang chưa có, hiển thị tooltip "sẽ có ở đợt sau" và không điều hướng. */
  path: string | null;
}

export const AI_PAGE = 10;
export const MY_WORK_PATH = '/viec-cua-toi';
export const AUDIT_PATH = '/nhat-ky-kiem-toan';
export const POLICY_PATH = '/tra-cuu-chinh-sach';

const item = (page: number, label: string, icon: RailItem['icon'], path: string | null = null): RailItem => ({
  page,
  label,
  icon,
  path,
});

const AI = item(AI_PAGE, 'Trợ lý AI', 'spark');
// Q-K: /chat và /dashboard được giữ và hiện trên điều hướng (trang nghiệp vụ chưa có nên đặt trước Trợ lý AI).
const KEPT: RailItem[] = [
  item(11, 'Trò chuyện', 'chat', '/chat'),
  item(12, 'Bảng điều khiển agent', 'dash', '/dashboard'),
];

export const RAIL_ITEMS: Record<UiRole, RailItem[]> = {
  qhkh: [
    item(2, 'Việc của tôi', 'inbox', MY_WORK_PATH),
    item(3, 'Tạo đề xuất vay', 'plus', '/de-xuat-vay'),
    item(4, 'Khách hàng SME', 'building'),
    item(7, 'Tra cứu chính sách', 'book', POLICY_PATH),
    ...KEPT,
    AI,
  ],
  httd: [
    item(2, 'Việc của tôi', 'inbox', MY_WORK_PATH),
    item(5, 'Đối chiếu tài liệu', 'filecheck', '/doi-chieu'),
    item(4, 'Khách hàng SME', 'building'),
    item(7, 'Tra cứu chính sách', 'book', POLICY_PATH),
    ...KEPT,
    AI,
  ],
  tdinh: [
    item(2, 'Việc của tôi', 'inbox', MY_WORK_PATH),
    item(5, 'Đối chiếu tài liệu', 'filecheck', '/doi-chieu'),
    item(4, 'Khách hàng SME', 'building'),
    item(7, 'Tra cứu chính sách', 'book', POLICY_PATH),
    ...KEPT,
    AI,
  ],
  ruiro: [
    item(2, 'Hồ sơ chờ ý kiến', 'inbox', MY_WORK_PATH),
    item(4, 'Khách hàng SME', 'building'),
    item(7, 'Tra cứu chính sách', 'book', POLICY_PATH),
    ...KEPT,
    AI,
  ],
  pheduyet: [
    item(2, 'Hồ sơ chờ phê duyệt', 'inbox', MY_WORK_PATH),
    item(6, 'Phiên Hội đồng tín dụng', 'users'),
    item(7, 'Tra cứu chính sách', 'book', POLICY_PATH),
    ...KEPT,
    AI,
  ],
  kiemtoan: [
    item(2, 'Hồ sơ vay – chỉ đọc', 'inbox', MY_WORK_PATH),
    item(8, 'Nhật ký kiểm toán', 'clock', AUDIT_PATH),
    item(6, 'Phiên Hội đồng tín dụng – chỉ đọc', 'users'),
    item(7, 'Tra cứu chính sách', 'book', POLICY_PATH),
    ...KEPT,
    AI,
  ],
  quantri: [item(9, 'Quản trị', 'gear')],
};

/** Vai trò có Trợ lý AI (quantri không có). */
export const roleHasAi = (role: UiRole | null | undefined): boolean => !!role && role !== 'quantri';
