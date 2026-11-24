import { useState } from 'react';
import { AiTag, StatusPill } from '@/components/ui';
import { cleanAiLine } from '@/features/dashboard/agentTrace';
import type { DisbursementCondition } from './types';
import styles from './loan-detail.module.css';

const when = (iso: string) => new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });

const APPROVED = ['APPROVED', 'APPROVED_WITH_CONDITIONS'];
/** Hồ sơ đã đóng mà không được phê duyệt: sẽ không bao giờ có điều kiện từ quyết định. */
const CLOSED_NO_APPROVAL = ['REJECTED', 'WITHDRAWN', 'CANCELLED'];

/** Dòng nhiều hơn số này thì gập, hiện "Xem thêm". */
export const COLLAPSE_AFTER = 5;

/** Điều kiện phải hoàn tất trước giải ngân: điều kiện đã ghi trên hồ sơ (người đúng vai xác nhận đề xuất của đội agent hoặc tự ghi) và điều kiện từ quyết định phê duyệt.
 *  Đề xuất chưa xác nhận của đội agent KHÔNG hiện ở đây (docs/business/rules.md): chúng nằm ở thẻ "Đề xuất hành động". */
export function PreDisbursementPanel({ status, decisionConditions, confirmed = [] }: { loanId?: string; status: string; decisionConditions?: string[] | null; confirmed?: DisbursementCondition[] }) {
  const approved = APPROVED.includes(status);
  const [all, setAll] = useState(false);
  const fromDecision = !approved ? [] : (decisionConditions ?? []).filter(Boolean);
  const total = confirmed.length + fromDecision.length;
  const room = all ? total : COLLAPSE_AFTER;
  const shownConfirmed = confirmed.slice(0, room);
  const shownDecision = fromDecision.slice(0, Math.max(0, room - shownConfirmed.length));
  return (
    <section className={styles.card} data-testid="pre-disbursement" aria-label="Điều kiện trước giải ngân">
      <div className={styles.cardH}><h2>Điều kiện trước giải ngân</h2></div>
      <div className={styles.cardB}>
        {total === 0 && <span className={styles.note} data-testid="pre-disbursement-empty">{approved || CLOSED_NO_APPROVAL.includes(status) ? 'Chưa có điều kiện nào được ghi.' : 'Điều kiện sẽ có sau khi cấp phê duyệt quyết định.'}</span>}
        {shownConfirmed.map((c) => (
          <div key={c.id} className={styles.item} data-testid="pre-disbursement-confirmed" data-origin={c.origin}>
            <span className={styles.readText}>{cleanAiLine(c.text)}</span>
            <span className={styles.note}>
              {c.origin === 'AGENT_PROPOSED' && <><AiTag>AI đề xuất</AiTag> </>}
              <StatusPill tone="ok">{c.origin === 'AGENT_PROPOSED' ? 'Đã được người xác nhận' : 'Do người ghi'}</StatusPill>
              {' '}{c.confirmed_by_name ?? 'Cán bộ'} · {when(c.created_at)}
            </span>
          </div>
        ))}
        {shownDecision.map((c) => <span key={`d-${c}`} data-testid="pre-disbursement-decision">Từ quyết định: {cleanAiLine(c)}</span>)}
        {total > COLLAPSE_AFTER && (
          <button type="button" className={styles.note} data-testid="pre-disbursement-toggle" aria-expanded={all} onClick={() => setAll((v) => !v)}
            style={{ justifySelf: 'start', background: 'none', border: 0, padding: 0, color: 'var(--brand-500)', cursor: 'pointer', textDecoration: 'underline' }}>
            {all ? 'Thu gọn' : `Xem thêm ${total - COLLAPSE_AFTER} điều kiện`}
          </button>
        )}
      </div>
    </section>
  );
}
