import { uiRoleFromRoles } from '@/auth/roleFromMe';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Input, Modal, Radio, Space, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { ActionButton, HumanBlock, StatusPill } from '@/components/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMe } from '@/auth/session';
import { normalizeError } from '@/services/apiClient';
import {
  addOpinion, concludeFlag, earlyWarning, extendDeadline, fetchActionState, handleFlag, runTransition, upgradeApproval,
} from './loanDetailService';
import { cleanAiLine } from '@/features/dashboard/agentTrace';
import { statusLabel } from '@/features/my-work/format';
import { DecisionModal } from './DecisionModal';
import type { Flag, LoanOverview } from './types';
import styles from './loan-detail.module.css';

export const BLOCKERS: Record<string, string> = {
  FIELDS_UNCONFIRMED: 'Còn trường dữ liệu hoặc mâu thuẫn chưa được xác nhận',
  FLAGS_OPEN: 'Còn cờ chặn trình chưa xử lý',
  REPORT_MISSING: 'Tờ trình chưa đủ 7 mục',
  RISK_OPINION_MISSING: 'Chưa có ý kiến Rủi ro',
  COMPLIANCE_OPINION_MISSING: 'Chưa có ý kiến Tuân thủ',
  CIC_FLAG_UNCONCLUDED: 'Cờ CIC khách tự nộp chưa có kết luận của Tuân thủ',
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
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [conclusion, setConclusion] = useState<string>('');
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => { setSlot(document.getElementById('loan-primary-action')); }, []);
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

  const blockedWhy = state.blockers.length > 0 ? `Chưa đủ điều kiện: ${state.blockers.map((b) => BLOCKERS[b] ?? b).join('; ')}` : undefined;
  const buttons: React.ReactNode[] = [];
  let headNode: React.ReactNode = null;
  let totalActions = 0;
  const lockNotes: Array<{ key: string; label: string; why: string }> = [];
  const notHolderWhy = state.can_write === false ? 'Hồ sơ đang do người khác xử lý; chỉ người đang giữ bước này mới thực hiện được.' : undefined;
  // Q-N: Tuân thủ ghi ý kiến, Rủi ro/Tuân thủ trả lại Thẩm định và trưởng phòng rút hồ sơ không cần giữ bước.
  const NO_HOLDER_NEEDED = ['op-comp', 'explain', 'fraud-hold', 'fraud-release', 'back', 'withdraw-customer', 'withdraw-overdue'];
  let lockedByHolder = false;
  const btn = (key: string, label: string, onClick: () => void, opts: { primary?: boolean; disabled?: string } = {}) => {
    const holderWhy = NO_HOLDER_NEEDED.includes(key) ? undefined : notHolderWhy;
    if (holderWhy) lockedByHolder = true;
    const why = holderWhy ?? opts.disabled;
    if (why && why !== blockedWhy && why !== notHolderWhy) lockNotes.push({ key, label, why });
    // Việc 2: nút đầu tiên của vai là nút chính (vàng) và nằm ở đầu trang; các nút còn lại ở thẻ hành động.
    const isHead = !!opts.primary && headNode === null;
    const node = <ActionButton key={key} variant={isHead ? 'gold' : 'default'} disabled={!!why} title={why} onClick={onClick}>{label}</ActionButton>;
    if (isHead) headNode = node; else buttons.push(node);
    totalActions += 1;
  };
  const rework = (status === 'RETURNED_TO_RM' || status === 'DRAFT') && has('credit_officer') && uiRoleFromRoles(me.roles) !== 'kiemtoan';
  if (rework) { headNode = <ActionButton key="rework" variant="gold" onClick={() => navigate(`/de-xuat-vay/${loanId}`)}>{status === 'DRAFT' ? 'Tiếp tục soạn đề xuất' : 'Sửa đề xuất'}</ActionButton>; totalActions += 1; }

  if ((status === 'RETURNED_TO_RM' || status === 'APPRAISAL_PENDING_INFO') && state.supplement) {
    const sup = state.supplement;
    const overdue = new Date(sup.due_at).getTime() < Date.now();
    if (has('credit_officer')) {
      btn('extend', sup.extended ? 'Đã gia hạn 1 lần' : 'Gia hạn bổ sung thêm 5 ngày LV',
        () => reasonAction('Gia hạn bổ sung', 'Lý do gia hạn', 'Gia hạn', (t) => extendDeadline(loanId, t)),
        { disabled: sup.extended ? 'Hạn bổ sung chỉ được gia hạn 1 lần' : undefined });
    }
    if (has('credit_officer') || has('credit_manager')) {
      btn('withdraw-customer', 'Khách rút hồ sơ', () => reasonAction('Rút hồ sơ (khách rút)', 'Lý do rút', 'Rút hồ sơ', transit('withdraw', { withdraw_kind: 'CUSTOMER' })));
      btn('withdraw-overdue', 'Rút hồ sơ quá hạn', () => reasonAction('Rút hồ sơ (quá hạn bổ sung)', 'Lý do rút', 'Rút hồ sơ', transit('withdraw', { withdraw_kind: 'OVERDUE' })),
        { disabled: overdue ? undefined : 'Chỉ rút loại "Quá hạn" khi hạn bổ sung đã qua' });
    }
  }
  if (status === 'APPRAISAL_PENDING_INFO' && has('document_reviewer')) {
    btn('accept-info', 'Ghi nhận đã bổ sung', () => void submit(() => runTransition(loanId, 'accept_info', state.version)), { primary: true });
  }
  if (status === 'CHECKING' && has('document_reviewer')) {
    btn('return', 'Trả lại QHKH', () => reasonAction('Trả lại QHKH', 'Lý do trả lại', 'Trả lại', transit('return_to_rm')));
  }
  if (status === 'APPRAISAL' && has('credit_appraiser')) {
    btn('info', 'Yêu cầu bổ sung', () => reasonAction('Yêu cầu bổ sung', 'Nội dung cần QHKH bổ sung', 'Gửi yêu cầu', transit('request_info')));
    btn('return', 'Trả lại QHKH', () => reasonAction('Trả lại QHKH', 'Lý do trả lại', 'Trả lại', transit('return_to_rm')));
    if (state.tier.upgrade_due) {
      btn('upgrade', `Nâng cấp phê duyệt (cấp ${state.tier.submitted} → ${state.tier.required})`, () =>
        reasonAction('Nâng cấp phê duyệt', 'Lý do nâng cấp', 'Nâng cấp', (t) => upgradeApproval(loanId, t)));
    }
    btn('risk', 'Trình Rủi ro', () => void submit(() => runTransition(loanId, 'submit_to_risk', state.version)), { primary: true, disabled: blockedWhy });
  }
  if (status === 'RISK_REVIEW') {
    const done = new Set(state.opinions.map((o) => o.kind));
    if (has('risk_officer') && !done.has('RISK')) btn('op-risk', 'Ghi ý kiến rủi ro', () => reasonAction('Ý kiến Rủi ro', 'Ý kiến của Rủi ro', 'Ghi ý kiến', (t) => addOpinion(loanId, 'RISK', t)), { primary: true });
    if (has('compliance_officer') && !done.has('COMPLIANCE')) btn('op-comp', 'Ghi ý kiến tuân thủ', () => reasonAction('Ý kiến Tuân thủ', 'Ý kiến của Tuân thủ', 'Ghi ý kiến', (t) => addOpinion(loanId, 'COMPLIANCE', t)), { primary: true });
    if (has('compliance_officer')) {
      btn('explain', 'Yêu cầu giải trình', () => reasonAction('Yêu cầu giải trình', 'Nội dung cần giải trình', 'Gửi yêu cầu', transit('request_explanation')));
      btn('fraud-hold', 'Giữ hồ sơ nghi gian lận', () => reasonAction('Giữ hồ sơ nghi gian lận', 'Căn cứ nghi ngờ', 'Giữ hồ sơ', transit('fraud_hold')));
    }
    if ((has('risk_officer') || has('compliance_officer')) ) btn('back', 'Trả lại Thẩm định', () => reasonAction('Trả lại Thẩm định', 'Lý do trả lại', 'Trả lại', transit('risk_return')));
    if (has('risk_officer')) btn('approval', 'Trình phê duyệt', () => void submit(() => runTransition(loanId, 'submit_to_approval', state.version)), { primary: true, disabled: blockedWhy });
  }
  if (status === 'RISK_PENDING_INFO' && has('document_reviewer')) {
    btn('accept-explanation', 'Ghi nhận đã giải trình', () => void submit(() => runTransition(loanId, 'accept_explanation', state.version)), { primary: true });
  }
  if (status === 'RISK_HOLD_FRAUD' && has('compliance_officer')) {
    btn('fraud-release', 'Đóng xử lý nghi gian lận', () => reasonAction('Đóng xử lý nghi gian lận', 'Kết luận xử lý', 'Đóng xử lý', transit('fraud_release')), { primary: true });
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
        const title = cleanAiLine(f.title);
        out.push(<Button key="handle" size="small" aria-label={`Xử lý cờ: ${title}`} onClick={() => reasonAction(`Xử lý cờ: ${title}`, 'Ghi chú xử lý', 'Đã xử lý', (t) => handleFlag(loanId, f.id, t))}>Xử lý cờ này</Button>);
      }
    }
    if (status === 'RISK_REVIEW' && has('compliance_officer') && f.code === 'cickh' && f.status !== 'CONCLUDED') {
      out.push(<Button key="conclude" size="small" onClick={() => open({ kind: 'conclude', flag: f })}>Kết luận cờ</Button>);
    }
    return out;
  };

  const decider = (has('loan_approver') && status === 'APPROVAL') || status === 'COUNCIL_SESSION';
  // Không có nút, ý kiến, cờ hay lý do khóa nào để hiển thị thì ẩn thẻ, tránh thẻ "Hành động" trống.
  const nothingToShow = totalActions === 0 && state.opinions.length === 0 && lockNotes.length === 0 && !notHolderWhy
    && state.blockers.length === 0 && !(state.excluded && has('loan_approver') && status === 'APPROVAL')
    && !overview.flags.some((f) => flagButtons(f).length > 0) && !error;
  if (nothingToShow) return null;
  return (
    <section id="hanh-dong" aria-label="Hành động trên hồ sơ" data-testid="actions-panel">
      {slot && headNode && createPortal(headNode, slot)}
      <HumanBlock title="Hành động" tag={decider ? 'Người quyết định' : uiRoleFromRoles(me.roles) === 'kiemtoan' ? 'Chỉ đọc' : 'Việc của bạn'}>
      <div className={styles.stackTight}>
      <Typography.Text type="secondary">AI chỉ đề xuất; người có thẩm quyền quyết định. Mọi hành động đều kiểm lại ở máy chủ.</Typography.Text>
      {state.blockers.length > 0 && totalActions > 0 && (
        <Alert type="warning" showIcon message="Chưa đủ điều kiện để trình"
          description={<ul style={{ margin: 0, paddingLeft: 18 }}>{state.blockers.map((b) => <li key={b}>{BLOCKERS[b] ?? b}</li>)}</ul>} />
      )}
      {notHolderWhy && lockedByHolder && <Alert type="info" showIcon message={notHolderWhy} data-testid="not-holder-notice" />}
      {state.excluded && has('loan_approver') && status === 'APPROVAL' && <Alert type="error" showIcon message={E8_TEXT} data-testid="e8-notice" />}
      {state.opinions.map((o) => (
        <div key={o.kind} className={styles.item} data-testid={`opinion-${o.kind}`}>
          <span><StatusPill tone="human">{o.kind === 'RISK' ? 'Ý kiến Rủi ro' : 'Ý kiến Tuân thủ'}</StatusPill> {o.author_name}</span>
          <div className={styles.readText}>{o.content}</div>
        </div>
      ))}
      {overview.flags.filter((f) => flagButtons(f).length > 0).map((f) => (
        <div key={f.id} className={styles.item} data-testid="flag-actions">
          <b>{cleanAiLine(f.title)}</b> <Space wrap>{flagButtons(f)}</Space>
        </div>
      ))}
      {rework && status === 'DRAFT' && <span className={styles.note}>Đề xuất đang là bản nháp. Nút “Tiếp tục soạn đề xuất” ở đầu trang mở lại bản nháp để hoàn thiện và trình.</span>}
      <Space wrap>{buttons}{!slot && headNode}</Space>
      {lockNotes.map((n) => <span key={n.key} className={styles.note}><LockOutlined aria-hidden /> {n.label}: {n.why}</span>)}
      {totalActions === 0 && <div><span className={styles.note}>{['APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED', 'WITHDRAWN'].includes(status)
        ? 'Hồ sơ đã kết thúc, không còn hành động nào.'
        : `Hồ sơ đang ở trạng thái "${statusLabel(status).toLowerCase()}", chưa tới bước của vai trò bạn nên chỉ xem.`}</span></div>}
      {error && !dialog && <Alert type="error" showIcon role="alert" message={error} />}
      </div>
      </HumanBlock>

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

      <DecisionModal open={dialog?.kind === 'decide'} loanId={loanId} applicationNumber={overview.loan.application_number}
        requestedAmount={Number(overview.loan.requested_amount)} requestedTerm={overview.loan.requested_term_months ?? 12}
        state={state} busy={busy} error={error} onCancel={() => setDialog(null)} onSubmit={(fn) => void submit(fn)} />
    </section>
  );
}
