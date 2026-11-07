import { Alert, Button, Input, Modal, Space, Tag } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getErrorMessage } from '@/services/apiClient';
import { checkItem } from './reconciliationService';
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
  return (
    <section className={styles.panel} aria-label="Checklist tài liệu">
      <h2>Checklist tài liệu</h2>
      {check.isError && <Alert type="error" showIcon message={getErrorMessage(check.error)} />}
      {view.items.map((it) => (
        <div key={it.item_id} className={styles.item} data-testid={`item-${it.code}`}>
          <Space wrap>
            <b>{it.code}</b>
            {!it.mandatory && <Tag>Có điều kiện</Tag>}
            <Tag color={it.status === 'VALID' ? 'success' : it.status === 'REQUIRED' ? 'error' : 'warning'}>
              {STATUS_TEXT[it.status] ?? it.status}
            </Tag>
            {it.has_exception && <Tag color="processing">Có ngoại lệ</Tag>}
          </Space>
          {it.document_ids.length === 0 && <span className={styles.note}>Chưa có tài liệu gắn vào</span>}
          {it.document_ids.map((id) => (
            <button
              key={id}
              type="button"
              className={styles.docBtn}
              aria-current={id === documentId}
              onClick={() => onOpenDocument(id)}
            >
              {titles.get(id) ?? id}
            </button>
          ))}
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
          {view.extra_document_ids.map((id) => (
            <button key={id} type="button" className={styles.docBtn} aria-current={id === documentId}
              onClick={() => onOpenDocument(id)}>{titles.get(id) ?? id}</button>
          ))}
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
