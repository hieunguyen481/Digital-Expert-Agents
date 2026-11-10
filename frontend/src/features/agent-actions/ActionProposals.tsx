import { useState } from 'react';
import { Alert, Button, Input, Tag } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMe } from '@/auth/session';
import { normalizeError } from '@/services/apiClient';
import {
  decideActionProposal, getActionProposals, type ActionProposal, type AgentCaseEvent, type ProposalKind,
} from '@/services/agentCaseService';

export const KIND_LABEL: Record<ProposalKind, string> = {
  add_risk_flag: 'Ghi cờ rủi ro',
  request_documents: 'Yêu cầu bổ sung tài liệu',
  add_disbursement_condition: 'Điều kiện trước giải ngân',
};
/** Vai trò được xác nhận/bỏ từng loại; backend kiểm lại bằng quyền của người bấm. */
const ROLES: Record<ProposalKind, string[]> = {
  add_risk_flag: ['credit_appraiser', 'risk_officer', 'document_reviewer'],
  request_documents: ['credit_appraiser'],
  add_disbursement_condition: ['credit_appraiser', 'loan_approver'],
};
const STATUS_TAG = { PROPOSED: ['gold', 'Chờ người xác nhận'], CONFIRMED: ['green', 'Đã xác nhận và thực hiện'], DISMISSED: ['default', 'Đã bỏ'] } as const;

/** Đề xuất hành động ghi của đội agent. AI chỉ đề xuất; người có thẩm quyền xác nhận hoặc bỏ, kèm lý do. */
export function ActionProposals({ caseId, loanId }: { caseId: string; loanId: string }) {
  const q = useQuery({
    queryKey: ['agent-proposals', caseId], queryFn: () => getActionProposals(caseId),
    // Chưa có đề xuất thì hỏi lại định kỳ (đội agent có thể đang chạy); xong hết thì dừng.
    refetchInterval: (query) => (!query.state.data?.length || query.state.data.some((p) => p.status === 'PROPOSED') ? 6000 : false),
  });
  if (q.isError) return <Alert type="error" showIcon message="Không tải được đề xuất hành động" description={normalizeError(q.error).message} />;
  if (!q.data || q.data.length === 0) return null;
  return (
    <section aria-label="Đề xuất hành động" data-testid="action-proposals" style={{ marginTop: 12 }}>
      <h3 style={{ margin: '0 0 6px' }}>Đề xuất hành động của đội agent</h3>
      {q.data.map((p) => <ProposalCard key={p.id} proposal={p} caseId={caseId} loanId={loanId} />)}
    </section>
  );
}

function ProposalCard({ proposal: p, caseId, loanId }: { proposal: ActionProposal; caseId: string; loanId: string }) {
  const me = useMe().data;
  const qc = useQueryClient();
  const [mode, setMode] = useState<'confirm' | 'dismiss' | null>(null);
  const [reason, setReason] = useState('');
  const canAct = (me?.roles ?? []).some((r) => ROLES[p.kind].includes(r));
  const act = useMutation({
    mutationFn: (verb: 'confirm' | 'dismiss') => decideActionProposal(p.id, verb, { reason: reason.trim(), loan_application_id: loanId }),
    onSuccess: () => {
      setMode(null); setReason('');
      void qc.invalidateQueries({ queryKey: ['agent-proposals', caseId] });
      void qc.invalidateQueries({ queryKey: ['agent-case-events', caseId] });
      void qc.invalidateQueries({ queryKey: ['loan-actions', loanId] });
    },
  });
  const [color, label] = STATUS_TAG[p.status];
  const docs = (p.params.documents as string[] | undefined) ?? [];
  return (
    <div data-testid="action-proposal" data-kind={p.kind} data-status={p.status}
      style={{ border: '1px solid #d9d9d9', borderRadius: 6, padding: 10, marginBottom: 8 }}>
      <div><Tag color="purple">{KIND_LABEL[p.kind]}</Tag><Tag color={color}>{label}</Tag><b>{p.title}</b></div>
      <div style={{ fontSize: 13, marginTop: 4 }}>Căn cứ: {p.rationale}</div>
      {docs.length > 0 && <ul style={{ margin: '4px 0', paddingLeft: 18, fontSize: 13 }}>{docs.map((d) => <li key={d}>{d}</li>)}</ul>}
      {p.evidence.length > 0 && (
        <ul style={{ margin: '4px 0', paddingLeft: 18, fontSize: 12, color: '#595959' }}>
          {p.evidence.map((e, i) => <li key={i}><code>{e.source}</code> {e.quote}</li>)}
        </ul>
      )}
      {p.status !== 'PROPOSED' && p.decided_reason && <div style={{ fontSize: 12 }}>Lý do của người xử lý: {p.decided_reason}</div>}
      {p.status === 'PROPOSED' && p.result && (p.result as { message?: string }).message && (
        <Alert type="warning" showIcon style={{ marginTop: 6 }} data-testid="proposal-refused"
          message={`Lần xác nhận trước bị từ chối: ${(p.result as { message?: string }).message}`} />
      )}
      {p.status === 'PROPOSED' && !canAct && (
        <div style={{ fontSize: 12, marginTop: 4 }} data-testid="proposal-locked">Chỉ người đúng vai trò mới xác nhận hoặc bỏ được đề xuất này.</div>
      )}
      {p.status === 'PROPOSED' && canAct && mode === null && (
        <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
          <Button type="primary" size="small" data-testid="proposal-confirm" onClick={() => setMode('confirm')}>Xác nhận</Button>
          <Button size="small" data-testid="proposal-dismiss" onClick={() => setMode('dismiss')}>Bỏ đề xuất</Button>
        </div>
      )}
      {mode && (
        <div style={{ marginTop: 6 }}>
          <Input.TextArea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} data-testid="proposal-reason"
            placeholder={mode === 'confirm' ? 'Lý do xác nhận (tối thiểu 5 ký tự)' : 'Lý do bỏ (tối thiểu 5 ký tự)'} />
          {act.isError && <Alert type="error" showIcon style={{ marginTop: 6 }} data-testid="proposal-error" message={normalizeError(act.error).message} />}
          <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
            <Button type="primary" size="small" data-testid="proposal-submit" loading={act.isPending}
              disabled={reason.trim().length < 5} onClick={() => act.mutate(mode)}>
              {mode === 'confirm' ? 'Xác nhận và thực hiện' : 'Bỏ đề xuất'}
            </Button>
            <Button size="small" onClick={() => { setMode(null); act.reset(); }}>Huỷ</Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ChainRow { id: string; kind: ProposalKind; title: string; steps: { label: string; tone: 'gold' | 'blue' | 'green' | 'red' | 'default'; text: string }[] }

/** Chuỗi trace của mỗi đề xuất: agent đề xuất → người xác nhận/bỏ → hệ thống thực hiện → kết quả. */
export function proposalChains(events: AgentCaseEvent[]): ChainRow[] {
  const rows = new Map<string, ChainRow>();
  for (const e of events) {
    const id = String(e.payload?.proposal_id ?? '');
    if (!e.type.startsWith('action_') || !id) continue;
    const kind = e.payload?.kind as ProposalKind;
    const row = rows.get(id) ?? { id, kind, title: String(e.payload?.title ?? KIND_LABEL[kind] ?? ''), steps: [] };
    if (e.type === 'action_proposed') {
      row.title = String(e.payload?.title ?? row.title);
      row.steps.push({ label: 'Agent đề xuất', tone: 'gold', text: String(e.payload?.rationale ?? '') });
    } else if (e.type === 'action_confirmed') row.steps.push({ label: 'Người xác nhận', tone: 'blue', text: String(e.payload?.reason ?? '') });
    else if (e.type === 'action_dismissed') row.steps.push({ label: 'Người bỏ đề xuất', tone: 'default', text: String(e.payload?.reason ?? '') });
    else if (e.type === 'action_executed') row.steps.push({ label: 'Hệ thống thực hiện', tone: 'green', text: 'Đã ghi vào hồ sơ bằng quyền của người xác nhận, có nhật ký kiểm toán.' });
    else if (e.type === 'action_refused') row.steps.push({ label: 'Hệ thống từ chối', tone: 'red', text: String(e.payload?.message ?? '') });
    rows.set(id, row);
  }
  return [...rows.values()];
}

export function ProposalChain({ events }: { events: AgentCaseEvent[] }) {
  const chains = proposalChains(events);
  if (chains.length === 0) return null;
  return (
    <section data-testid="trace-proposals" style={{ marginTop: 12 }}>
      <h3 style={{ margin: '0 0 6px' }}>Hành động đề xuất và xác nhận</h3>
      {chains.map((c) => (
        <div key={c.id} data-testid="trace-proposal-chain" style={{ fontSize: 13, marginBottom: 8 }}>
          <b>{KIND_LABEL[c.kind] ?? c.kind}</b>: {c.title}
          {c.steps.map((s, i) => (
            <div key={i} style={{ marginLeft: 12 }}><Tag color={s.tone}>{i + 1}. {s.label}</Tag>{s.text}</div>
          ))}
        </div>
      ))}
    </section>
  );
}
