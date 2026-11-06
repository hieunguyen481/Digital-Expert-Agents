import { InboxOutlined, SafetyOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Tooltip, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import type { UiRole } from '@/auth/roleFromMe';
import { UI_ROLE_LABEL } from '@/auth/roleFromMe';
import styles from './shell.module.css';

interface NoAccessProps {
  role: UiRole | null;
  /** Tên trang trung tính, không tên khách hàng. */
  pageName?: string;
}

/** Trạng thái "Không có quyền" dùng chung (design-system §12): đúng 1 nút có icon. */
export function NoAccess({ role, pageName = 'Việc của tôi' }: NoAccessProps) {
  const navigate = useNavigate();
  const isAdmin = role === 'quantri';
  const title = isAdmin ? 'Không có quyền xem nội dung nghiệp vụ' : 'Không có quyền xem trang này';
  const reason = isAdmin
    ? 'Tài khoản quản trị chỉ quản lý người dùng, phân quyền, ngưỡng và cấu hình AI. Nội dung tín dụng được ẩn theo quyền truy cập dữ liệu.'
    : `Trang “${pageName}” không thuộc phạm vi của ${role ? UI_ROLE_LABEL[role] : 'tài khoản này'}.`;

  return (
    <div className={styles.noAccessWrap}>
      <Typography.Title level={4} className={styles.noAccessHead}>
        {pageName}
      </Typography.Title>
      <div className={styles.noAccess} role="alert">
        <SafetyOutlined className={styles.noAccessIcon} aria-hidden />
        <Typography.Title level={5}>{title}</Typography.Title>
        <Typography.Paragraph type="secondary">{reason}</Typography.Paragraph>
        {isAdmin ? (
          <Tooltip title="Trang Quản trị sẽ có ở đợt sau">
            <span>
              <Button icon={<SettingOutlined />} disabled>
                Mở Quản trị
              </Button>
            </span>
          </Tooltip>
        ) : (
          <Button type="primary" icon={<InboxOutlined />} onClick={() => navigate('/viec-cua-toi')}>
            Về Việc của tôi
          </Button>
        )}
      </div>
    </div>
  );
}
