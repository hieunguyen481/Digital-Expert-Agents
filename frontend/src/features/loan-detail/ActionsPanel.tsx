import { useState } from 'react';
import { Alert, Button, Input, InputNumber, Modal, Radio, Select, Space, Tag, Typography } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMe } from '@/auth/session';
import { normalizeError } from '@/services/apiClient';
import {
  addOpinion, concludeFlag, earlyWarning, fetchActionState, handleFlag, runTransition, upgradeApproval,
} from './loanDetailService';
import type { Flag, LoanOverview } from './types';
import styles from './loan-detail.module.css';

const BLOCKERS: Record<string, string> = {
  FIELDS_UNCONFIRMED: 'Còn trường dữ liệu hoặc mâu thuẫn chưa được xác nhận',
  FLAGS_OPEN: 'Còn cờ chặn trình chưa xử lý',
  REPORT_MISSING: 'Tờ trình chưa đủ 7 mục',
  OPINIONS_MISSING: 'Thiếu Ý kiến Rủi ro, ý kiến Tuân thủ hoặc kết luận cờ CIC khách tự nộp',
  VALIDITY_AT_APPROVAL: 'CIC hoặc sao kê hết hiệu lực tại ngày trình phê duyệt',
  CHECK_FAILED: 'Hồ sơ chưa qua kiểm tra: còn tài liệu thiếu, hết hạn hoặc trường dữ liệu chưa được xác nhận',
};
const CONCLUSIONS = [
  { value: 'SUSPECTED_FRAUD', label: 'Nghi gian lận – tạm dừng hồ sơ' },
  { value: 'INSUFFICIENT_BASIS', label: 'Chưa đủ căn cứ – yêu cầu giải trình' },
  { value: 'NO_ISSUE', label: 'Không có vấn đề – đi tiếp' },
];
const E8_TEXT = 'Bạn đã tham gia hồ sơ này hoặc từng là QHKH của khách trong 2 năm (E8): không được phê duyệt. Hồ sơ cần chuyển người cùng cấp.';

type Dialog =
  | { kind: 'reason'; title: string; label: string; required: boolean; okText: string; run: (text: string) => Promise<unknown> }
  | { kind: 'conclude'; flag: Flag }
  | { kind: 'decide' }
  | null;

function errorText(e: unknown): string {
  const err = normalizeError(e);
  const blockers = (err.details as { blockers?: string[] } | undefined)?.blockers;
  if (blockers?.length) return `Chưa đủ điều kiện: ${blockers.map((b) => BLOCKERS[b] ?? b).join('; ')}`;
  return err.message;
}

export function ActionsPanel({ loanId, overview }: { loanId: string; overview: LoanOverview }) {
  const me = useMe().data;
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [conclusion, setConclusion] = useState<string>('');
  const [decision, setDecision] = useState({ type: 'APPROVED', amount: Number(overview.loan.requested_amount), term: overview.loan.requested_term_months ?? 12, conditions: '', target: 'APPRAISAL' });
  const [exceptionChoice, setExceptionChoice] = useState<Record<string, 'ACCEPTED' | 'REJECTED'>>({});
  const st = useQuery({ queryKey: ['loan-actions', loanId], queryFn: () => fetchActionState(loanId) });
  const roles = new Set(me?.roles ?? []);
  const state = st.data;
  if (!state || !me) return null;
  const status = overview.loan.status;
  const has = (r: string) => roles.has(r);
  const refresh = async () => {
    await Promise.all([qc.invalidateQueries({ queryKey: ['loan-overview', loanId] }), qc.invalidateQueries({ queryKey: ['loan-actions', loanId] }), qc.invalidateQueries({ queryKey: ['loan-memo', loanId] })]);
  };
  const submit = async (fn: () => Promise<unknown>) => {
    setBusy(true); setError(null);
    try { await fn(); setDialog(null); setText(''); await refresh(); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };
  const open = (d: Dialog) => { setError(null); setText(''); setConclusion(''); setDialog(d); };
  const reasonAction = (title: string, label: string, okText: string, run: (t: string) => Promise<unknown>, required = true) =>
    open({ kind: 'reason', title, label, required, okText, run });
  const transit = (action: string, params?: Record<string, unknown>) => (reason: string) => runTransition(loanId, action, state.version, reason, params);

  const buttons: React.ReactNode[] = [];
  const btn = (key: string, label: string, onClick: () => void, opts: { primary?: boolean; disabled?: string } = {}) =>
    buttons.push(<Button key={key} type={opts.primary ? 'primary' : 'default'} disabled={!!opts.disabled} title={opts.disabled} onClick={onClick}>{label}</Button>);

  if (status === 'APPRAISAL_PENDING_INFO' && has('document_reviewer')) {
    btn('accept-info', 'Ghi nhận đã bổ sung', () => void submit(() => runTransition(loanId, 'accept_info', state.version)), { primary: true });
  }
  if (status === 'APPRAISAL' && has('credit_appraiser')) {
    btn('info', 'Yêu cầu bổ sung', () => reasonAction('Yêu cầu bổ sung', 'Nội dung cần QHKH bổ sung', 'Gửi yêu cầu', transit('request_info')));
    btn('return', 'Trả lại QHKH', () => reasonAction('Trả lại QHKH', 'Lý do trả lại', 'Trả lại', transit('return_to_rm')));
    if (state.tier.upgrade_due) {
      btn('upgrade', `Nâng cấp phê duyệt (cấp ${state.tier.submitted} → ${state.tier.required})`, () =>
        reasonAction('Nâng cấp phê duyệt', 'Lý do nâng cấp', 'Nâng cấp', (t) => upgradeApproval(loanId, t)));
    }
    btn('risk', 'Trình Rủi ro', () => void submit(() => runTransition(loanId, 'submit_to_risk', state.version)), { primary: true });
  }
  if (status === 'RISK_REVIEW') {
    const done = new Set(state.opinions.map((o) => o.kind));
    if (has('risk_officer') && !done.has('RISK')) btn('op-risk', 'Ghi Ý kiến Rủi ro', () => reasonAction('Ý kiến Rủi ro', 'Ý kiến của Rủi ro', 'Ghi ý kiến', (t) => addOpinion(loanId, 'RISK', t)));
    if (has('compliance_officer') && !done.has('COMPLIANCE')) btn('op-comp', 'Ghi ý kiến Tuân thủ', () => reasonAction('Ý kiến Tuân thủ', 'Ý kiến của Tuân thủ', 'Ghi ý kiến', (t) => addOpinion(loanId, 'COMPLIANCE', t)));
    if ((has('risk_officer') || has('compliance_officer')) ) btn('back', 'Trả lại Thẩm định', () => reasonAction('Trả lại Thẩm định', 'Lý do trả lại', 'Trả lại', transit('risk_return')));
    if (has('risk_officer')) btn('approval', 'Trình phê duyệt', () => void submit(() => runTransition(loanId, 'submit_to_approval', state.version)), { primary: true });
  }
  if (status === 'APPROVAL' && has('loan_approver')) {
    const why = state.excluded ? E8_TEXT : undefined;
    btn('decide', 'Quyết định', () => open({ kind: 'decide' }), { primary: true, disabled: why });
  }

  const flagButtons = (f: Flag) => {
    const out: React.ReactNode[] = [];
    if (status === 'APPRAISAL' && has('credit_appraiser') && f.status === 'OPEN') {
      if (f.code === 'cickh') {
        out.push(<Button key="warn" size="small" disabled={!!f.early_warned_at} onClick={() => reasonAction('Báo sớm Tuân thủ', 'Ghi chú (không bắt buộc)', 'Gửi báo sớm', (t) => earlyWarning(loanId, f.id, t), false)}>{f.early_warned_at ? 'Đã báo sớm' : 'Báo sớm Tuân thủ'}</Button>);
      } else {
        out.push(<Button key="handle" size="small" onClick={() => reasonAction(`Xử lý cờ: ${f.title}`, 'Ghi chú xử lý', 'Đã xử lý', (t) => handleFlag(loanId, f.id, t))}>Xử lý cờ</Button>);
      }
    }
    if (status === 'RISK_REVIEW' && has('compliance_officer') && f.code === 'cickh' && f.status !== 'CONCLUDED') {
      out.push(<Button key="conclude" size="small" onClick={() => open({ kind: 'conclude', flag: f })}>Kết luận cờ</Button>);
    }
    return out;
  };

  const approving = decision.type !== 'REJECTED';
  const amountInvalid = approving && !(decision.amount > 0);
  const termInvalid = approving && !(decision.term > 0);
  const exceptionsDecided = state.pending_exceptions.every((e) => exceptionChoice[e.id]);
  const decideBody = () => {
    const params = {
      decision_type: decision.type, approved_amount: decision.amount, approved_term_months: decision.term,
      conditions: decision.conditions.split('\n').map((c) => c.trim()).filter(Boolean),
      exceptions: state.pending_exceptions.map((e) => ({ id: e.id, decision: exceptionChoice[e.id] })),
    };
    return params;
  };

  return (
    <section className={styles.panel} aria-label="Hành động trên hồ sơ" data-testid="actions-panel">
      <h2>Hành động</h2>
      <Typography.Text type="secondary">AI chỉ đề xuất; người có thẩm quyền quyết định. Mọi hành động đều kiểm lại ở máy chủ.</Typography.Text>
      {state.blockers.length > 0 && (
        <Alert type="warning" showIcon style={{ margin: '8px 0' }} message="Chưa đủ điều kiện để trình"
          description={<ul style={{ margin: 0 }}>{state.blockers.map((b) => <li key={b}>{BLOCKERS[b] ?? b}</li>)}</ul>} />
      )}
      {state.excluded && has('loan_approver') && status === 'APPROVAL' && <Alert type="error" showIcon style={{ margin: '8px 0' }} message={E8_TEXT} data-testid="e8-notice" />}
      {state.opinions.map((o) => (
        <div key={o.kind} className={styles.section} data-testid={`opinion-${o.kind}`}>
          <Tag>{o.kind === 'RISK' ? 'Ý kiến Rủi ro' : 'Ý kiến Tuân thủ'}</Tag> {o.author_name}
          <div className={styles.readText}>{o.content}</div>
        </div>
      ))}
      {overview.flags.filter((f) => flagButtons(f).length > 0).map((f) => (
        <div key={f.id} className={styles.section} data-testid="flag-actions">
          <b>{f.title}</b> <Space>{flagButtons(f)}</Space>
        </div>
      ))}
      <Space wrap style={{ marginTop: 8 }}>{buttons}</Space>
      {buttons.length === 0 && <div><span className={styles.note}>Không có hành động nào cho vai trò của bạn ở bước này.</span></div>}
      {error && !dialog && <Alert type="error" showIcon role="alert" style={{ marginTop: 8 }} message={error} />}

      <Modal open={dialog?.kind === 'reason'} title={dialog?.kind === 'reason' ? dialog.title : ''} onCancel={() => setDialog(null)} destroyOnClose
        okText={dialog?.kind === 'reason' ? dialog.okText : 'OK'} cancelText="Hủy" confirmLoading={busy}
        okButtonProps={{ disabled: dialog?.kind === 'reason' && dialog.required && !text.trim() }}
        onOk={() => dialog?.kind === 'reason' && void submit(() => dialog.run(text.trim()))}>
        <label htmlFor="action-text">{dialog?.kind === 'reason' ? dialog.label : ''}{dialog?.kind === 'reason' && dialog.required ? ' (bắt buộc)' : ''}</label>
        <Input.TextArea id="action-text" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
        {error && <Alert type="error" showIcon role="alert" style={{ marginTop: 8 }} message={error} />}
      </Modal>

      <Modal open={dialog?.kind === 'conclude'} title="Kết luận cờ CIC khách tự nộp" onCancel={() => setDialog(null)} destroyOnClose
        okText="Kết luận" cancelText="Hủy" confirmLoading={busy} okButtonProps={{ disabled: !conclusion || !text.trim() }}
        onOk={() => dialog?.kind === 'conclude' && void submit(() => concludeFlag(loanId, dialog.flag.id, conclusion, text.trim()))}>
        <Radio.Group value={conclusion} onChange={(e) => setConclusion(e.target.value)} style={{ display: 'grid', gap: 6 }}>
          {CONCLUSIONS.map((c) => <Radio key={c.value} value={c.value}>{c.label}</Radio>)}
        </Radio.Group>
        <label htmlFor="action-text" style={{ display: 'block', marginTop: 8 }}>Lý do (bắt buộc)</label>
        <Input.TextArea id="action-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
        {error && <Alert type="error" showIcon role="alert" style={{ marginTop: 8 }} message={error} />}
      </Modal>

      <Modal open={dialog?.kind === 'decide'} title="Quyết định của cấp phê duyệt" onCancel={() => setDialog(null)} destroyOnClose
        okText="Ghi quyết định" cancelText="Hủy" confirmLoading={busy} okButtonProps={{ disabled: !text.trim() || !exceptionsDecided || amountInvalid || termInvalid }}
        onOk={() => void submit(() => runTransition(loanId, 'decide', state.version, text.trim(), decideBody()))}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Select value={decision.type} onChange={(v) => setDecision({ ...decision, type: v })} style={{ width: '100%' }} aria-label="Loại quyết định"
            options={[{ value: 'APPROVED', label: 'Phê duyệt' }, { value: 'APPROVED_WITH_CONDITIONS', label: 'Phê duyệt có điều kiện' }, { value: 'REJECTED', label: 'Từ chối' }]} />
          {decision.type !== 'REJECTED' && (
            <>
              <label>Số tiền duyệt (VND) <InputNumber style={{ width: '100%' }} status={amountInvalid ? 'error' : undefined} value={decision.amount} onChange={(v) => setDecision({ ...decision, amount: Number(v ?? 0) })} /></label>
              <label>Kỳ hạn (tháng) <InputNumber style={{ width: '100%' }} status={termInvalid ? 'error' : undefined} value={decision.term} onChange={(v) => setDecision({ ...decision, term: Number(v ?? 0) })} /></label>
              {amountInvalid && <Typography.Text type="danger" role="alert">Số tiền duyệt phải lớn hơn 0.</Typography.Text>}
              {termInvalid && <Typography.Text type="danger" role="alert">Kỳ hạn duyệt phải lớn hơn 0.</Typography.Text>}
              {decision.type === 'APPROVED_WITH_CONDITIONS' && <Input.TextArea rows={2} placeholder="Mỗi điều kiện một dòng" value={decision.conditions} onChange={(e) => setDecision({ ...decision, conditions: e.target.value })} />}
            </>
          )}
          {state.pending_exceptions.map((e) => (
            <div key={e.id} className={styles.section} data-testid="exception-row">
              <b>Ngoại lệ {e.checklist_code}</b> · {e.reason}
              <Radio.Group value={exceptionChoice[e.id]} onChange={(ev) => setExceptionChoice({ ...exceptionChoice, [e.id]: ev.target.value })}>
                <Radio value="ACCEPTED">Chấp thuận</Radio><Radio value="REJECTED">Từ chối (phải trả lại bổ sung)</Radio>
              </Radio.Group>
            </div>
          ))}
          <label htmlFor="action-text">Lý do quyết định (bắt buộc)</label>
          <Input.TextArea id="action-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
          <Button disabled={busy || !text.trim() || !exceptionsDecided} onClick={() => void submit(() => runTransition(loanId, 'return_for_supplement', state.version, text.trim(), { target: decision.target, exceptions: decideBody().exceptions }))}>Trả lại bổ sung</Button>
          <Select value={decision.target} onChange={(v) => setDecision({ ...decision, target: v })} aria-label="Trả về"
            options={[{ value: 'APPRAISAL', label: 'Trả về Thẩm định' }, { value: 'RETURNED_TO_RM', label: 'Trả về QHKH (sửa đề xuất)' }]} />
          {error && <Alert type="error" showIcon role="alert" message={error} />}
        </Space>
      </Modal>
    </section>
  );
}
