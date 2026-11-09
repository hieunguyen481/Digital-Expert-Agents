import { Alert, Button, Progress, Typography } from 'antd';
import { useRef, useState } from 'react';
import { getErrorMessage } from '@/services/apiClient';
import { uploadAttachment } from '@/services/attachmentService';
import type { ReconView } from './types';
import styles from './reconciliation.module.css';

interface Props {
  loanId: string;
  view: ReconView;
  onUploaded: (documentId: string) => void;
}

/** Chỉ QHKH tải tài liệu (rules Q6). Khóa kèm câu lý do khi hồ sơ không ở trạng thái cho phép. */
export function UploadPanel({ loanId, view, onUploaded }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [percent, setPercent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { can_upload: canUpload, upload_lock: lock } = view.permissions;
  if (!canUpload && !lock) return null;

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (!view.customer_id) {
      setError('Hồ sơ chưa gắn khách hàng vay nên chưa tải được tài liệu.');
      return;
    }
    setError(null);
    setPercent(0);
    try {
      const done = await uploadAttachment(file, {
        customerId: view.customer_id,
        loanApplicationId: loanId,
        onProgress: setPercent,
      });
      onUploaded(done.id);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setPercent(null);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <section className={styles.panel} aria-label="Tải tài liệu lên">
      <h2>Tải tài liệu lên</h2>
      <Typography.Paragraph className={styles.note}>
        Chỉ đọc được PDF có lớp chữ. Trường do AI trích ra là đề xuất, chưa có hiệu lực cho tới khi người xác nhận.
      </Typography.Paragraph>
      <input
        ref={input}
        type="file"
        accept="application/pdf"
        data-testid="recon-upload"
        style={{ display: 'none' }}
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      <Button
        onClick={() => input.current?.click()}
        loading={percent !== null}
        disabled={!canUpload}
        title={canUpload ? undefined : (lock ?? undefined)}
      >
        Tải tài liệu bổ sung
      </Button>
      {!canUpload && lock && <Typography.Text type="secondary" data-testid="upload-lock">{lock}</Typography.Text>}
      {percent !== null && <Progress percent={percent} size="small" />}
      {error && <Alert type="error" showIcon message={error} />}
    </section>
  );
}
