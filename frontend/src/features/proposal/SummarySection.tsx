import { useRef } from 'react';
import { Alert, Button, Space, Table, Tag, Typography } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '@/services/apiClient';
import { fetchDraft, fetchSubmitConditions, submitProposal } from './proposalService';
import type { SubmitCondition } from './types';

interface Props {
  loanId: string;
  /** Đang có bản nháp xung đột hoặc chưa lưu được: không gửi. */
  blocked: boolean;
  saveNow: () => Promise<unknown>;
  onGoto: (section: SubmitCondition['section']) => void;
  onSubmitted: () => void;
}

export function SummarySection({ loanId, blocked, saveNow, onGoto, onSubmitted }: Props) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['proposal-conditions', loanId], queryFn: () => fetchSubmitConditions(loanId) });
  const sent = useRef(false);
  const submit = useMutation({
    mutationFn: async () => {
      await saveNow();
      const fresh = await fetchDraft(loanId);
      return submitProposal(loanId, fresh.version);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['proposal-conditions', loanId] });
      onSubmitted();
    },
  });
  if (q.isError) return <Alert type="error" showIcon message={getErrorMessage(q.error)} />;
  if (!q.data) return <div aria-busy>Đang kiểm tra điều kiện gửi…</div>;
  const c = q.data;
  const locked = !c.can_submit || blocked;
  const reason = blocked ? 'Bản nháp đang xung đột, tải lại trước khi gửi.' : c.lock_reason;
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={5} style={{ margin: 0 }}>Điều kiện gửi Hỗ trợ tín dụng (HTTD)</Typography.Title>
      <p style={{ margin: 0 }}>Cấp phê duyệt theo tổng cấp tín dụng của nhóm: <b>cấp {c.required_tier}</b></p>
      <Table<SubmitCondition>
        size="small"
        pagination={false}
        rowKey="code"
        aria-label="Bảng điều kiện gửi"
        dataSource={c.conditions}
        columns={[
          {
            title: 'Điều kiện',
            dataIndex: 'label',
            render: (_, r) => (
              <span data-testid={`cond-${r.code}`}>
                {r.label}
                {r.detail && <div style={{ opacity: 0.75 }}>{r.detail}</div>}
              </span>
            ),
          },
          {
            title: 'Kết quả',
            width: 160,
            render: (_, r) =>
              r.kind === 'CARRIED' ? <Tag color="warning">Chuyển kèm cờ</Tag> : r.met ? <Tag color="success">Đạt</Tag> : <Tag color="error">Chưa đạt</Tag>,
          },
          {
            title: '',
            width: 100,
            render: (_, r) =>
              r.kind === 'BLOCKER' && !r.met && r.section !== 'summary' ? (
                <Button type="link" onClick={() => onGoto(r.section)}>Đi tới</Button>
              ) : null,
          },
        ]}
      />
      {submit.isSuccess && (
        <Alert type="success" showIcon message="Đã gửi đề xuất sang Hỗ trợ tín dụng." />
      )}
      {submit.isError && <Alert type="error" showIcon message={getErrorMessage(submit.error)} />}
      <Space>
        <Button
          type={submit.isSuccess ? 'default' : 'primary'}
          disabled={submit.isSuccess}
          aria-disabled={locked || submit.isPending || submit.isSuccess}
          title={locked ? (reason ?? undefined) : undefined}
          loading={submit.isPending}
          onClick={() => {
            if (sent.current || locked || submit.isPending || submit.isSuccess) return;
            sent.current = true; // chặn bấm đúp trước khi React kịp vẽ lại trạng thái đang gửi
            submit.mutate(undefined, { onSettled: () => { sent.current = false; } });
          }}
        >
          Gửi Hỗ trợ tín dụng
        </Button>
        {locked && reason && <span>{reason}</span>}
      </Space>
    </Space>
  );
}
