import { Button, Result } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { getErrorMessage, normalizeError } from '@/services/apiClient';

export interface PageErrorProps {
  title?: string;
  error?: unknown;
  /** Thông điệp tự đặt, ưu tiên hơn message suy ra từ `error`. */
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  compact?: boolean;
}

/**
 * Error state dùng chung.
 * Không bao giờ hiển thị stack trace cho người dùng cuối.
 */
export function PageError({
  title = 'Đã có lỗi xảy ra',
  error,
  description,
  onRetry,
  retryLabel = 'Thử lại',
  compact = false,
}: PageErrorProps) {
  const status = error ? normalizeError(error).status : undefined;
  // 403/404: thử lại vô ích; chỉ 5xx và lỗi mạng mới có nút "Thử lại".
  if (status === 403 || status === 404) {
    return (
      <Result
        status={status}
        title={status === 403 ? 'Bạn không có quyền xem nội dung này' : 'Không tìm thấy nội dung'}
        subTitle={description ?? (status === 403
          ? 'Hồ sơ nằm ngoài phạm vi vai trò hoặc đơn vị của bạn. Nếu cần xem, hãy nhờ người đang giữ hồ sơ.'
          : 'Đường dẫn có thể đã cũ, hoặc hồ sơ không còn tồn tại.')}
        style={compact ? { padding: '24px 16px' } : undefined}
        extra={<Link to="/viec-cua-toi"><Button type="primary">Về Việc của tôi</Button></Link>}
      />
    );
  }
  const message = description ?? (error ? getErrorMessage(error) : 'Vui lòng thử lại sau ít phút.');

  return (
    <Result
      status="warning"
      title={title}
      subTitle={message}
      style={compact ? { padding: '24px 16px' } : undefined}
      extra={
        onRetry && (
          <Button type="primary" icon={<ReloadOutlined />} onClick={onRetry}>
            {retryLabel}
          </Button>
        )
      }
    />
  );
}
