import { useState } from 'react';
import { Alert, Button, Input, Modal, Select } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMe } from '@/auth/session';
import { normalizeError } from '@/services/apiClient';
import { fetchReassignCandidates, reassignLoan } from './loanDetailService';
import styles from './loan-detail.module.css';

/** Q-D: trưởng phòng chuyển hồ sơ cho người khác cùng vai trò, bắt buộc lý do. */
export function ReassignControl({ loanId }: { loanId: string }) {
  const me = useMe().data;
  const qc = useQueryClient();
  const isManager = !!me?.roles?.includes('credit_manager');
  const q = useQuery({ queryKey: ['reassign-candidates', loanId], queryFn: () => fetchReassignCandidates(loanId), enabled: isManager });
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<string>();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!isManager || !q.data?.length) return null;
  const submit = async () => {
    if (!target) return;
    setBusy(true); setError(null);
    try {
      await reassignLoan(loanId, target, reason.trim());
      setOpen(false); setTarget(undefined); setReason('');
      await Promise.all(['loan-overview', 'loan-actions', 'reassign-candidates'].map((k) => qc.invalidateQueries({ queryKey: [k, loanId] })));
    } catch (e) { setError(normalizeError(e).message); } finally { setBusy(false); }
  };
  return (
    <section className={styles.card} data-testid="reassign" aria-label="Phân công lại">
      <div className={styles.cardH}><h2>Phân công lại (trưởng phòng)</h2></div>
      <div className={styles.cardB}>
      <span className={styles.note}>Chuyển người đang xử lý bước hiện tại sang người khác cùng vai trò, không bị loại theo quy tắc tách bạch.</span>
      <div><Button onClick={() => { setError(null); setOpen(true); }}>Chuyển người xử lý</Button></div>
      </div>
      <Modal open={open} title="Chuyển người xử lý" onCancel={() => setOpen(false)} destroyOnClose okText="Chuyển" cancelText="Hủy"
        confirmLoading={busy} okButtonProps={{ disabled: !target || !reason.trim() }} onOk={() => void submit()}>
        <Select value={target} onChange={setTarget} style={{ width: '100%', marginBottom: 8 }} aria-label="Người nhận" placeholder="Chọn người nhận"
          options={q.data.map((c) => ({ value: c.employee_id, label: `${c.full_name} · ${c.open_count} việc đang mở` }))} />
        <label htmlFor="reassign-reason">Lý do chuyển (bắt buộc)</label>
        <Input.TextArea id="reassign-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        {(!target || !reason.trim()) && (
          <div role="note" className={styles.note} style={{ marginTop: 8 }} data-testid="reassign-lock-reason">
            {!target ? 'Chọn người nhận để bật nút Chuyển.' : 'Nhập lý do chuyển để bật nút Chuyển.'}
          </div>
        )}
        {error && <Alert type="error" showIcon role="alert" style={{ marginTop: 8 }} message={error} />}
      </Modal>
    </section>
  );
}
