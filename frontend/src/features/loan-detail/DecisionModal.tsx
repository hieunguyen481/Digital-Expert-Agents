import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Input, InputNumber, Modal, Radio, Typography } from 'antd';
import { fmtNum } from './format';
import { runTransition } from './loanDetailService';
import type { CaseActionState } from './types';
import styles from './loan-detail.module.css';

type DecisionType = 'APPROVED' | 'APPROVED_WITH_CONDITIONS' | 'REJECTED' | 'RETURN';
const OPTIONS: Array<{ value: DecisionType; title: string; hint: string }> = [
  { value: 'APPROVED', title: 'Phê duyệt', hint: 'Theo đúng đề xuất' },
  { value: 'APPROVED_WITH_CONDITIONS', title: 'Phê duyệt có điều kiện', hint: 'Nêu hạn mức và điều kiện bắt buộc' },
  { value: 'REJECTED', title: 'Từ chối', hint: 'Kết thúc hồ sơ' },
  { value: 'RETURN', title: 'Trả lại', hint: 'Về Thẩm định hoặc về QHKH để sửa' },
];
const TARGETS = [{ value: 'APPRAISAL', label: 'Trả về Thẩm định' }, { value: 'RETURNED_TO_RM', label: 'Trả về QHKH (sửa đề xuất)' }];
const vnd = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

interface Props {
  open: boolean;
  loanId: string;
  applicationNumber: string;
  requestedAmount: number;
  requestedTerm: number;
  state: CaseActionState;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (fn: () => Promise<unknown>) => void;
}

/** Modal quyết định của cấp phê duyệt (mockup 12b, 12c): 4 thẻ lựa chọn, nút cam kết vàng chỉ cho phê duyệt (từ chối: đỏ, trả lại: navy), bước xác nhận không hoàn tác. */
export function DecisionModal({ open, loanId, applicationNumber, requestedAmount, requestedTerm, state, busy, error, onCancel, onSubmit }: Props) {
  const [type, setType] = useState<DecisionType>('APPROVED');
  const [amount, setAmount] = useState(requestedAmount);
  const [term, setTerm] = useState(requestedTerm);
  const [conditions, setConditions] = useState('');
  const [target, setTarget] = useState('APPRAISAL');
  const [text, setText] = useState('');
  const [choice, setChoice] = useState<Record<string, 'ACCEPTED' | 'REJECTED'>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);
  const backRef = useRef<HTMLButtonElement>(null);
  // Bước xác nhận không hoàn tác: focus mặc định ở "Quay lại", không ở nút cam kết.
  useEffect(() => { if (confirming) backRef.current?.focus(); }, [confirming]);

  const approving = type === 'APPROVED' || type === 'APPROVED_WITH_CONDITIONS';
  const amountInvalid = approving && !(amount > 0);
  const termInvalid = approving && !(term > 0);
  const exceptionsDecided = state.pending_exceptions.every((e) => choice[e.id] && reasons[e.id]?.trim());
  const ready = !!text.trim() && exceptionsDecided && !amountInvalid && !termInvalid;
  const exceptions = state.pending_exceptions.map((e) => ({ id: e.id, decision: choice[e.id], reason: reasons[e.id]?.trim() }));
  const condList = conditions.split('\n').map((c) => c.trim()).filter(Boolean);
  const targetLabel = type === 'RETURN' && target === 'RETURNED_TO_RM' ? 'QHKH' : 'Thẩm định';
  const confirmText = { APPROVED: 'Xác nhận phê duyệt', APPROVED_WITH_CONDITIONS: 'Xác nhận phê duyệt có điều kiện', REJECTED: 'Xác nhận từ chối', RETURN: `Xác nhận trả về ${targetLabel}` }[type];
  const submitLabel = type === 'RETURN' ? 'Trả lại bổ sung' : 'Ghi quyết định';

  const run = () => onSubmit(() => type === 'RETURN'
    ? runTransition(loanId, 'return_for_supplement', state.version, text.trim(), { target, exceptions })
    : runTransition(loanId, 'decide', state.version, text.trim(), {
      decision_type: type,
      ...(approving ? { approved_amount: amount, approved_term_months: term } : {}),
      conditions: condList,
      exceptions,
    }));

  const footer = confirming ? (
    <>
      <Button ref={backRef} onClick={() => setConfirming(false)} disabled={busy}>Quay lại</Button>
      <Button type="primary" danger={type === 'REJECTED'} className={approving ? styles.goldBtn : undefined} loading={busy} onClick={run}>{confirmText}</Button>
    </>
  ) : (
    <>
      <Button onClick={onCancel}>Hủy</Button>
      <Button type="primary" className={styles.goldBtn} disabled={!ready} onClick={() => setConfirming(true)}>{submitLabel}</Button>
    </>
  );

  return (
    <Modal open={open} width={640} onCancel={onCancel} destroyOnClose maskClosable={false} footer={footer}
      title={confirming ? `${confirmText}?` : 'Quyết định của cấp phê duyệt'}>
      {confirming ? (
        <div className={styles.stackTight} data-testid="decision-confirm">
          {type === 'RETURN' ? (
            <p>Hồ sơ {applicationNumber} quay lại bước {targetLabel === 'QHKH' ? 'Soạn đề xuất, người nhận là QHKH phụ trách' : 'Thẩm định'}. Lý do được gửi kèm và ghi vào nhật ký kiểm toán. Hồ sơ chưa bị từ chối.</p>
          ) : type === 'REJECTED' ? (
            <p>Hồ sơ {applicationNumber} bị từ chối và kết thúc. <b>Không hoàn tác được.</b> Quyết định ghi tên bạn vào nhật ký kiểm toán.</p>
          ) : (
            <>
              <p>Hồ sơ {applicationNumber} chuyển sang bước Hoàn tất với hạn mức <b className={styles.num}>{vnd(amount)}</b> đồng (đề nghị {fmtNum(requestedAmount / 1e9)} tỷ đồng), kỳ hạn {term} tháng.</p>
              {condList.length > 0 && (<><b>Điều kiện bắt buộc trước giải ngân:</b><ol className={styles.condOl}>{condList.map((c) => <li key={c}>{c}</li>)}</ol></>)}
              {exceptions.length > 0 && <p>Ngoại lệ: {exceptions.filter((e) => e.decision === 'ACCEPTED').length} chấp thuận, {exceptions.filter((e) => e.decision === 'REJECTED').length} từ chối.</p>}
              <p><b>Không hoàn tác được.</b> Quyết định ghi tên bạn vào nhật ký kiểm toán.</p>
            </>
          )}
          {error && <Alert type="error" showIcon role="alert" message={error} />}
        </div>
      ) : (
        <div className={styles.stackTight}>
          <div role="radiogroup" aria-label="Loại quyết định" className={styles.opts}>
            {OPTIONS.map((o, i) => (
              <label key={o.value} className={styles.opt} data-focus-ring>
                <input type="radio" name="decision-type" value={o.value} checked={type === o.value} autoFocus={i === 0} onChange={() => setType(o.value)} />
                <span><b>{o.title}</b><small>{o.hint}</small></span>
              </label>
            ))}
          </div>
          {approving && (
            <>
              <div className={styles.field}>
                <label htmlFor="decision-amount">Hạn mức phê duyệt (đồng) <span className={styles.req}>(bắt buộc)</span></label>
                <InputNumber id="decision-amount" className={styles.numIn} style={{ width: '100%' }} addonAfter="đồng" aria-describedby="decision-amount-h"
                  formatter={(v) => (v == null ? '' : vnd(Number(v)))} parser={(v) => Number((v ?? '').replace(/[^0-9]/g, ''))}
                  status={amountInvalid ? 'error' : undefined} value={amount} onChange={(v) => setAmount(Number(v ?? 0))} />
                <span id="decision-amount-h" className={styles.hint}>Đề nghị {fmtNum(requestedAmount / 1e9)} tỷ đồng.</span>
                {amountInvalid && <Typography.Text type="danger" role="alert">Số tiền duyệt phải lớn hơn 0.</Typography.Text>}
              </div>
              <div className={styles.field}>
                <label htmlFor="decision-term">Kỳ hạn (tháng) <span className={styles.req}>(bắt buộc)</span></label>
                <InputNumber id="decision-term" className={styles.numIn} style={{ width: '100%' }} addonAfter="tháng" status={termInvalid ? 'error' : undefined} value={term} onChange={(v) => setTerm(Number(v ?? 0))} />
                {termInvalid && <Typography.Text type="danger" role="alert">Kỳ hạn duyệt phải lớn hơn 0.</Typography.Text>}
              </div>
              {type === 'APPROVED_WITH_CONDITIONS' && (
                <div className={styles.field}>
                  <label htmlFor="decision-conditions">Điều kiện bắt buộc trước giải ngân</label>
                  <Input.TextArea id="decision-conditions" rows={2} placeholder="Mỗi điều kiện một dòng" value={conditions} onChange={(e) => setConditions(e.target.value)} />
                </div>
              )}
            </>
          )}
          {type === 'RETURN' && (
            <fieldset className={styles.fieldset}>
              <legend>Trả về cho</legend>
              <Radio.Group value={target} onChange={(e) => setTarget(e.target.value)} options={TARGETS} />
            </fieldset>
          )}
          {state.pending_exceptions.map((e) => (
            <fieldset key={e.id} className={styles.fieldset} data-testid="exception-row">
              <legend>Ngoại lệ {e.checklist_label ?? e.checklist_code}</legend>
              <p className={styles.note}>{e.reason}</p>
              <Radio.Group aria-label={`Quyết định cho ngoại lệ ${e.checklist_label ?? e.checklist_code}`} value={choice[e.id]} onChange={(ev) => setChoice({ ...choice, [e.id]: ev.target.value })}>
                <Radio value="ACCEPTED">Chấp thuận</Radio><Radio value="REJECTED">Từ chối (phải trả lại bổ sung)</Radio>
              </Radio.Group>
              <Input aria-label={`Lý do ngoại lệ ${e.checklist_label ?? e.checklist_code}`} placeholder="Lý do chấp thuận / từ chối (bắt buộc)" value={reasons[e.id] ?? ''}
                onChange={(ev) => setReasons({ ...reasons, [e.id]: ev.target.value })} />
            </fieldset>
          ))}
          <div className={styles.field}>
            <label htmlFor="action-text">Lý do quyết định <span className={styles.req}>(bắt buộc)</span></label>
            <Input.TextArea id="action-text" rows={3} aria-describedby="action-text-h" value={text} onChange={(e) => setText(e.target.value)} />
            <span id="action-text-h" className={styles.hint}>Lý do được ghi vào nhật ký kiểm toán.</span>
          </div>
          {error && <Alert type="error" showIcon role="alert" message={error} />}
        </div>
      )}
    </Modal>
  );
}
