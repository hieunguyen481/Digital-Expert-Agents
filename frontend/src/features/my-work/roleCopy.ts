import type { UiRole } from '@/auth/roleFromMe';

export const PAGE_TITLE: Record<UiRole, string> = {
  tdinh: 'Việc của tôi',
  qhkh: 'Việc của tôi',
  httd: 'Việc của tôi',
  ruiro: 'Việc của tôi',
  pheduyet: 'Việc của tôi',
  kiemtoan: 'Hồ sơ vay (chỉ đọc)',
  quantri: 'Quản trị',
  truongphong: 'Hồ sơ của phòng',
};

/** Câu giải thích khi vai không có hồ sơ nào trong phạm vi. */
export const EMPTY_COPY: Record<UiRole, string> = {
  tdinh: 'Khi có hồ sơ chuyển tới bước thẩm định của bạn, hồ sơ sẽ hiện ở đây và tăng số trên thanh trái.',
  qhkh: 'Khi bạn tạo đề xuất vay hoặc có hồ sơ bị trả lại, hồ sơ sẽ hiện ở đây.',
  httd: 'Khi có hồ sơ cần kiểm tra tài liệu, hồ sơ sẽ hiện ở đây và tăng số trên thanh trái.',
  ruiro: 'Khi có hồ sơ chờ ý kiến rủi ro hoặc tuân thủ, hồ sơ sẽ hiện ở đây và tăng số trên thanh trái.',
  pheduyet: 'Khi có hồ sơ thuộc thẩm quyền phê duyệt của bạn, hồ sơ sẽ hiện ở đây và tăng số trên thanh trái.',
  kiemtoan: 'Chưa có hồ sơ hoặc quyết định nào để xem trong phạm vi của bạn.',
  quantri: '',
  truongphong: 'Khi phòng có hồ sơ đang xử lý, hồ sơ sẽ hiện ở đây.',
};

/** Tiêu đề thẻ bảng: một tên chung, không lặp tiêu đề trang. */
export const QUEUE_TITLE: Record<UiRole, string> = {
  tdinh: 'Danh sách hồ sơ',
  qhkh: 'Danh sách hồ sơ',
  httd: 'Danh sách hồ sơ',
  ruiro: 'Danh sách hồ sơ',
  pheduyet: 'Danh sách hồ sơ',
  kiemtoan: 'Danh sách hồ sơ',
  quantri: 'Danh sách hồ sơ',
  truongphong: 'Danh sách hồ sơ',
};

export const WORK_ROLES: UiRole[] = ['qhkh', 'httd', 'tdinh', 'ruiro', 'pheduyet', 'kiemtoan', 'truongphong'];
