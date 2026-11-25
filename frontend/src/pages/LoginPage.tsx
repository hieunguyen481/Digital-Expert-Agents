import { LoginOutlined } from '@ant-design/icons';
import { Alert, Button } from 'antd';
import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { isAuthenticated, login } from '@/auth/keycloak';
import { SHBLogo } from '@/components/common/SHBLogo';
import styles from './LoginPage.module.css';

/** Chỉ chấp nhận đường dẫn nội bộ để tránh open redirect. */
function sanitizeReturnTo(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/';
  return raw;
}

/** Trang đăng nhập: bên trái nền thương hiệu trơn với một câu giới thiệu, bên phải một nút sang trang xác thực. */
export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const [redirecting, setRedirecting] = useState(false);
  const [failed, setFailed] = useState(false);
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'));
  const expired = searchParams.get('reason') === 'expired';

  if (isAuthenticated()) {
    return <Navigate to={returnTo} replace />;
  }

  async function handleLogin() {
    setRedirecting(true);
    setFailed(false);
    try {
      await login(returnTo);
    } catch {
      setFailed(true);
      setRedirecting(false);
    }
  }

  return (
    <div className={styles.login}>
      <a href="#main" className={styles.skip}>Bỏ qua tới nội dung</a>
      <section className={styles.left} aria-label="Giới thiệu">
        <SHBLogo variant="white" size="large" showProductName className={styles.brand} />
        <div className={styles.copy}>
          <h2 className={styles.lead}>Thẩm định hồ sơ vay doanh nghiệp</h2>
          <p className={styles.intro}>
            Đội agent đọc báo cáo tài chính, CIC và tài sản bảo đảm, tính chỉ số và nêu rủi ro. Chuyên viên kiểm tra,
            người có thẩm quyền quyết định.
          </p>
        </div>
        <p className={styles.foot}>Hệ thống nội bộ · chỉ dành cho cán bộ tín dụng</p>
      </section>
      <main id="main" tabIndex={-1} className={styles.right}>
        <div className={styles.box}>
          <h1 className={styles.title}>Đăng nhập</h1>
          <p className={styles.sub}>Dùng tài khoản nội bộ của ngân hàng.</p>
          {expired && !failed && (
            <Alert
              className={styles.alert}
              type="warning"
              showIcon
              role="status"
              data-testid="login-expired"
              title="Phiên đăng nhập đã hết hạn."
              description="Vì an toàn, phiên tự đóng sau một thời gian không hoạt động. Hãy đăng nhập lại; bạn sẽ quay về đúng trang đang làm."
            />
          )}
          {failed && (
            <Alert
              className={styles.alert}
              type="error"
              showIcon
              role="alert"
              data-testid="login-error"
              title="Chưa thể chuyển sang trang xác thực."
              description="Kiểm tra kết nối mạng nội bộ rồi thử lại. Nếu vẫn lỗi, liên hệ Quản trị hệ thống."
            />
          )}
          {!expired && !failed && (
            <Alert
              className={styles.alert}
              type="info"
              showIcon
              title="Bạn sẽ được chuyển sang trang xác thực của ngân hàng, rồi quay lại đây sau khi đăng nhập."
            />
          )}
          <Button type="primary" size="large" block icon={<LoginOutlined />} loading={redirecting} onClick={() => void handleLogin()}>
            Đăng nhập bằng tài khoản nội bộ
          </Button>
          <p className={styles.help}>
            Quên mật khẩu hoặc bị khóa tài khoản: liên hệ Quản trị hệ thống qua đầu mối hỗ trợ nội bộ.
          </p>
        </div>
      </main>
    </div>
  );
}
