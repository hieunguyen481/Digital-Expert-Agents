import type { UiRole } from '@/auth/roleFromMe';

export const PAGE_TITLE: Record<UiRole, string> = {
  tdinh: 'Việc của tôi',
  qhkh: 'Hồ sơ của tôi',
  httd: 'Hồ sơ chờ kiểm tra',
  ruiro: 'Hồ sơ chờ ý kiến',
  pheduyet: 'Hồ sơ chờ phê duyệt',
  kiemtoan: 'Hồ sơ vay (chỉ đọc)',
  quantri: 'Quản trị',
  truongphong: 'Hồ sơ của phòng',
};

export const QUEUE_TITLE: Record<UiRole, string> = {
  tdinh: 'Hàng chờ của tôi',
  qhkh: 'Hồ sơ của tôi',
  httd: 'Hồ sơ chờ kiểm tra',
  ruiro: 'Hồ sơ chờ ý kiến',
  pheduyet: 'Hồ sơ chờ phê duyệt',
  kiemtoan: 'Hồ sơ & quyết định gần đây',
  quantri: 'Quản trị',
  truongphong: 'Hồ sơ của phòng',
};

export const WORK_ROLES: UiRole[] = ['qhkh', 'httd', 'tdinh', 'ruiro', 'pheduyet', 'kiemtoan', 'truongphong'];
