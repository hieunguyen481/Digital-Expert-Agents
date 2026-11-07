import { Alert, Button, Space } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '@/services/apiClient';
import { transferToAppraisal } from './reconciliationService';
import type { ReconTransfer } from './types';

interface Props {
  loanId: string;
  transfer: ReconTransfer;
  onDone: () => void;
}

/** Mở hay khóa do cổng `checking_pass` của workflow quyết; trang chỉ hiện lý do cổng trả về. */
export function TransferBar({ loanId, transfer, onDone }: Props) {
  const qc = useQueryClient();
  const go = useMutation({
    mutationFn: () => transferToAppraisal(loanId, transfer.expected_version),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reconciliation', loanId] });
      void qc.invalidateQueries({ queryKey: ['work-items'] });
      onDone();
    },
  });
  if (!transfer.visible) return null;
  return (
    <Space direction="vertical" style={{ width: '100%' }} data-testid="transfer-bar">
      {transfer.locked && (
        <Alert type="warning" showIcon message="Chưa thể chuyển Thẩm định"
          description={<ul style={{ margin: 0, paddingLeft: 18 }}>{transfer.reasons.map((r) => <li key={r}>{r}</li>)}</ul>} />
      )}
      {!transfer.locked && transfer.carried_flags.length > 0 && (
        <Alert type="info" showIcon message={`Chuyển kèm cờ: ${transfer.carried_flags.join(', ')}`} />
      )}
      {go.isError && <Alert type="error" showIcon message={getErrorMessage(go.error)} />}
      <Button type="primary" disabled={transfer.locked} loading={go.isPending} onClick={() => go.mutate()}>
        Chuyển Thẩm định
      </Button>
    </Space>
  );
}
