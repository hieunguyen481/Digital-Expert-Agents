import { Alert, Button, Input, Modal, Popconfirm, Space } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StatusPill } from '@/components/ui';
import { getErrorMessage } from '@/services/apiClient';
import { checkItem, removeReconDocument } from './reconciliationService';
import type { ReconView } from './types';
import styles from './reconciliation.module.css';

const STATUS_TEXT: Record<string, string> = {
  VALID: 'Đạt', RECEIVED: 'Đã nhận, chờ hậu kiểm', REQUIRED: 'Còn thiếu', INCOMPLETE: 'Chưa đạt',
  EXPIRED: 'Hết hạn', WAIVED: 'Miễn', NOT_APPLICABLE: 'Không áp dụng',
};

interface Props {
  loanId: string;
  view: ReconView;
  documentId: string | null;
  onOpenDocument: (id: string) => void;
}

export function ChecklistPanel({ loanId, view, documentId, onOpenDocument }: Props) {
  const qc = useQueryClient();
  const titles = new Map(view.documents.map((d) => [d.document_id, d.title ?? d.document_type]));
  const [failing, setFailing] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const check = useMutation({
    mutationFn: (v: { id: string; result: 'PASS' | 'FAIL'; note: string | null }) => checkItem(loanId, v.id, v.result, v.note),
    onSuccess: () => {
      setFailing(null);
      setNote('');
      void qc.invalidateQueries({ queryKey: ['reconciliation', loanId] });
      void qc.invalidateQueries({ queryKey: ['recon-log', loanId] });
    },
  });
  const failedIds = new Set(view.documents.filter((d) => d.processing_status === 'FAILED').map((d) => d.document_id));
  const canRemove = view.permissions.can_upload || view.permissions.can_check || view.permissions.can_resolve;
  const remove = useMutation({
    mutationFn: (id: string) => removeReconDocument(loanId, id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['reconciliation', loanId] }),
  });
  const docRow = (id: string) => (
    <span key={id} className={styles.docRow}>
      <button type="button" className={styles.docBtn} aria-current={id === documentId} data-testid={`doc-${id}`}
        onClick={() => onOpenDocument(id)}>{titles.get(id) ?? id}</button>
      {failedIds.has(id) && <StatusPill tone="bad">Lỗi xử lý</StatusPill>}
      {failedIds.has(id) && canRemove && (
        <Popconfirm title="Gỡ tài liệu lỗi khỏi hồ sơ?" description="Bản gốc vẫn được lưu; tài liệu không còn tính vào checklist."
          okText="Gỡ" cancelText="Hủy" onConfirm={() => remove.mutate(id)}>
          <Button size="small" danger loading={remove.isPending} data-testid={`remove-${id}`}>Gỡ tài liệu lỗi</Button>
        </Popconfirm>
      )}
    </span>
  );
  return (
    <section className={styles.panel} aria-label="Checklist tài liệu">
      <h2>Checklist tài liệu</h2>
      {check.isError && <Alert type="error" showIcon message={getErrorMessage(check.error)} />}
      {remove.isError && <Alert type="error" showIcon message={getErrorMessage(remove.error)} />}
      {view.items.map((it) => (
        <div key={it.item_id} className={styles.item} data-testid={`item-${it.code}`}>
          <Space wrap>
            <b>{it.label ?? it.code}</b>
            {!it.mandatory && <StatusPill>Có điều kiện</StatusPill>}
            <StatusPill tone={it.status === 'VALID' ? 'ok' : it.status === 'REQUIRED' ? 'bad' : 'warn'}>
              {STATUS_TEXT[it.status] ?? it.status}
            </StatusPill>
            {it.has_exception && <StatusPill tone="info">Có ngoại lệ</StatusPill>}
          </Space>
          {it.document_ids.length === 0 && <span className={styles.note}>Chưa có tài liệu gắn vào</span>}
          {it.document_ids.map(docRow)}
          {it.check && (
            <span className={styles.note}>
              Hậu kiểm: {it.check.result === 'PASS' ? 'đạt' : 'không đạt'} · {it.check.actor_name ?? ''}
              {it.check.note ? ` · ${it.check.note}` : ''}
            </span>
          )}
          {view.permissions.can_check && view.status === 'CHECKING' && it.document_ids.length > 0 && (
            <Space>
              {it.status !== 'VALID' && (
                <Button size="small" onClick={() => check.mutate({ id: it.item_id, result: 'PASS', note: null })}
                  disabled={check.isPending}>Đạt</Button>
              )}
              <Button size="small" danger onClick={() => setFailing(it.item_id)}>Không đạt</Button>
            </Space>
          )}
        </div>
      ))}
      {view.extra_document_ids.length > 0 && (
        <div className={styles.item}>
          <b>Tài liệu ngoài checklist</b>
          {view.extra_document_ids.map(docRow)}
        </div>
      )}
      <Modal
        open={failing !== null}
        title="Ghi lý do không đạt"
        okText="Ghi nhận không đạt"
        cancelText="Hủy"
        okButtonProps={{ disabled: note.trim().length < 5, loading: check.isPending }}
        onOk={() => failing && check.mutate({ id: failing, result: 'FAIL', note: note.trim() })}
        onCancel={() => setFailing(null)}
      >
        <Input.TextArea aria-label="Lý do không đạt" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </Modal>
    </section>
  );
}
