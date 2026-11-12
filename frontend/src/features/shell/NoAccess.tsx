import { InboxOutlined, SettingOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import type { UiRole } from '@/auth/roleFromMe';
import { StateBlock } from '@/components/ui/StateBlock';
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
      <p className={styles.noAccessHead}>{pageName}</p>
      <StateBlock
        kind="forbidden"
        alert
        headingLevel={1}
        title={title}
        description={reason}
        action={
          isAdmin ? (
            <Button type="primary" icon={<SettingOutlined />} onClick={() => navigate('/quan-tri')}>
              Mở Quản trị
            </Button>
          ) : (
            <Button type="primary" icon={<InboxOutlined />} onClick={() => navigate('/viec-cua-toi')}>
              Về Việc của tôi
            </Button>
          )
        }
      />
    </div>
  );
}
