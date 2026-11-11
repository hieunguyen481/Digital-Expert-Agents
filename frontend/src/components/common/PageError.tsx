import { Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { StateBlock } from '@/components/ui/StateBlock';
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
  if (status === 404 && error && normalizeError(error).code === 'LOAN_REASSIGNED') {
    return (
      <StateBlock
        kind="notfound"
        alert
        compact={compact}
        title="Hồ sơ đã chuyển cho người khác"
        description="Hồ sơ này không còn ở bước của bạn. Nếu cần xem, hãy nhờ người đang giữ hồ sơ hoặc Trưởng phòng."
        action={<Link to="/viec-cua-toi"><Button type="primary">Về Việc của tôi</Button></Link>}
      />
    );
  }
  if (status === 403 || status === 404) {
    return (
      <StateBlock
        kind={status === 403 ? 'forbidden' : 'notfound'}
        alert
        compact={compact}
        title={status === 403 ? 'Bạn không có quyền xem nội dung này' : 'Không tìm thấy nội dung'}
        description={description ?? (status === 403
          ? 'Hồ sơ ngoài phạm vi được xem của vai trò hoặc đơn vị bạn. Nếu cần xem, hãy nhờ người đang giữ hồ sơ.'
          : 'Đường dẫn có thể đã cũ, hồ sơ không còn tồn tại, hoặc hồ sơ ngoài phạm vi được xem của vai trò bạn.')}
        action={<Link to="/viec-cua-toi"><Button type="primary">Về Việc của tôi</Button></Link>}
      />
    );
  }
  const message = description ?? (error ? getErrorMessage(error) : 'Vui lòng thử lại sau ít phút.');

  return (
    <StateBlock
      kind="error"
      alert
      compact={compact}
      title={title}
      description={message}
      action={
        onRetry && (
          <Button type="primary" icon={<ReloadOutlined />} onClick={onRetry}>
            {retryLabel}
          </Button>
        )
      }
    />
  );
}
