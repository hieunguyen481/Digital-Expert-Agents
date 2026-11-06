import { Skeleton } from 'antd';
import type { ReactNode } from 'react';
import { NoAccess } from '@/features/shell/NoAccess';
import { useMe } from './session';
import { uiRoleFromRoles, type UiRole } from './roleFromMe';

interface RequireRoleProps {
  allow: UiRole[];
  /** Tên trang trung tính cho trạng thái không có quyền. */
  pageName?: string;
  children: ReactNode;
}

/** Chặn trang theo vai trò hiển thị: chưa có `Me` thì skeleton, không thuộc `allow` thì NoAccess. */
export function RequireRole({ allow, pageName, children }: RequireRoleProps) {
  const { data, isError } = useMe();
  if (!data) {
    return isError ? <NoAccess role={null} pageName={pageName} /> : (
        <div role="status" aria-label="Đang tải" style={{ padding: 32 }}>
          <Skeleton active />
        </div>
      );
  }
  const role = uiRoleFromRoles(data.roles);
  if (role === null || !allow.includes(role)) {
    return <NoAccess role={role} pageName={pageName} />;
  }
  return <>{children}</>;
}
