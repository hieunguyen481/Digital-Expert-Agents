import { Alert, Button, Input, Radio, Space, Tag, Typography } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getErrorMessage } from '@/services/apiClient';
import { resolveConflict } from './reconciliationService';
import type { ReconConflict } from './types';
import styles from './reconciliation.module.css';

interface Props {
  loanId: string;
  conflicts: ReconConflict[];
  canResolve: boolean;
  onOpenField: (documentId: string, fieldId: string) => void;
}

export function ConflictPanel({ loanId, conflicts, canResolve, onOpenField }: Props) {
  if (conflicts.length === 0) return null;
  return (
    <section className={styles.panel} aria-label="Mâu thuẫn giữa các nguồn">
      <h2>Mâu thuẫn giữa các nguồn</h2>
      <p className={styles.note}>
        Hệ thống không tự chọn số nào. Người có thẩm quyền chốt nguồn và ghi lý do; số gốc vẫn được giữ nguyên.
      </p>
      {conflicts.map((c) => (
        <ConflictCard key={c.conflict_id} loanId={loanId} conflict={c} canResolve={canResolve} onOpenField={onOpenField} />
      ))}
    </section>
  );
}

function ConflictCard({ loanId, conflict, canResolve, onOpenField }: Props & { conflict: ReconConflict }) {
  const qc = useQueryClient();
  const [chosen, setChosen] = useState<string | null>(conflict.chosen_field_id);
  const [reason, setReason] = useState('');
  const resolve = useMutation({
    mutationFn: () => resolveConflict(loanId, conflict.conflict_id, chosen as string, reason.trim()),
    onSuccess: () => {
      setReason('');
      void qc.invalidateQueries({ queryKey: ['reconciliation', loanId] });
      void qc.invalidateQueries({ queryKey: ['recon-log', loanId] });
    },
  });
  const done = conflict.chosen_field_id !== null;
  return (
    <div className={styles.item} data-testid={`conflict-${conflict.code}`}>
      <Space>
        <Typography.Text strong>{conflict.code}</Typography.Text>
        <Tag color={done ? 'success' : 'warning'}>{done ? 'Đã chốt nguồn' : 'Chưa chốt'}</Tag>
      </Space>
      <Radio.Group
        value={chosen}
        onChange={(e) => setChosen(e.target.value as string)}
        disabled={!canResolve}
        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        {conflict.sources.map((s) => (
          <div key={s.field_id} className={styles.source}>
            <Radio value={s.field_id} data-testid={`source-${s.field_id}`}>
              <b>{s.value ?? '—'}</b> · {s.field_name}
            </Radio>
            <span className={styles.note}>
              {s.document_title ?? ''} {s.page_number ? `· trang ${s.page_number}` : ''} · {s.source_type === 'AI_OCR' ? 'AI trích xuất' : s.source_type}
            </span>
            <Button type="link" size="small" style={{ padding: 0, width: 'fit-content' }}
              onClick={() => onOpenField(s.document_id, s.field_id)}>Xem vùng tô trong tài liệu</Button>
          </div>
        ))}
      </Radio.Group>
      {done && (
        <span className={styles.note}>
          Đã chốt bởi {conflict.resolved_by_name ?? '—'}: {conflict.resolution_reason}
        </span>
      )}
      {canResolve && (
        <>
          <Input.TextArea aria-label="Lý do chốt nguồn" rows={2} placeholder="Lý do chốt nguồn (tối thiểu 5 ký tự)"
            value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button type="primary" onClick={() => resolve.mutate()}
            disabled={!chosen || chosen === conflict.chosen_field_id || reason.trim().length < 5}
            loading={resolve.isPending}>Chốt nguồn này</Button>
        </>
      )}
      {resolve.isError && <Alert type="error" showIcon message={getErrorMessage(resolve.error)} />}
    </div>
  );
}
