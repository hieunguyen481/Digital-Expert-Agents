import { useState } from 'react';
import { Alert, Button, Input } from 'antd';
import { AiText } from '@/features/dashboard/components/AiText';
import { AiTag, StatusPill, type PillTone } from '@/components/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { coversAiText, cleanAiLine, exactDocumentList, rationaleText, recountTitle, sourceLabel, sourceQuoteParts, stripKindLabel, withListHint } from '@/features/dashboard/agentTrace';
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
const STATUS_TAG: Record<string, [PillTone, string]> = { PROPOSED: ['warn', 'Chờ người xác nhận'], CONFIRMED: ['ok', 'Đã xác nhận và thực hiện'], DISMISSED: ['neutral', 'Đã bỏ'] };

const evidenceKey = (e: unknown): string => (typeof e === 'string' ? cleanAiLine(e) : sourceLabel(String((e as { source?: string } | null)?.source ?? '')));
/** Nguồn xuất hiện ở từ hai thẻ trở lên: in một lần ở đầu khối, mỗi thẻ chỉ giữ nguồn riêng. */
export function sharedSources(list: ActionProposal[]): string[] {
  if (list.length < 2) return [];
  const count = new Map<string, number>();
  for (const p of list) for (const k of new Set((p.evidence ?? []).map(evidenceKey).filter(Boolean))) count.set(k, (count.get(k) ?? 0) + 1);
  return [...count].filter(([, n]) => n >= 2).map(([k]) => k);
}

/** Đề xuất hành động ghi của đội agent. AI chỉ đề xuất; người có thẩm quyền xác nhận hoặc bỏ, kèm lý do. */
export function ActionProposals({ caseId, loanId }: { caseId: string; loanId: string }) {
  const q = useQuery({
    queryKey: ['agent-proposals', caseId], queryFn: () => getActionProposals(caseId),
    // Chưa có đề xuất thì hỏi lại định kỳ (đội agent có thể đang chạy); xong hết thì dừng.
    refetchInterval: (query) => (!query.state.data?.length || query.state.data.some((p) => p.status === 'PROPOSED') ? 6000 : false),
  });
  if (q.isError) return <Alert type="error" showIcon message="Không tải được đề xuất hành động" description={normalizeError(q.error).message} />;
  if (!q.data || q.data.length === 0) return null;
  const shared = sharedSources(q.data);
  return (
    <section aria-label="Đề xuất hành động" data-testid="action-proposals" style={{ display: 'grid', gap: 'var(--s3)' }}>
      <h3 style={{ margin: 0, font: '600 var(--fs-13)/1.4 var(--font-body)' }}>Đề xuất hành động của đội agent</h3>
      <span style={{ fontSize: 'var(--fs-12)', color: 'var(--ink-2)' }}>AI chỉ đề xuất. Chưa xác nhận thì chưa có thay đổi nào được ghi vào hồ sơ.</span>
      {shared.length > 0 && <span data-testid="proposal-shared-sources" style={{ fontSize: 'var(--fs-12)', color: 'var(--ink-2)' }}>Căn cứ chung: {shared.join(', ')}</span>}
      {q.data.map((p) => <ProposalCard key={p.id} proposal={p} caseId={caseId} loanId={loanId} shared={shared} />)}
    </section>
  );
}

/** Danh sách tài liệu đã làm sạch của đề xuất: MỘT nguồn cho thẻ và ngăn kéo, để hai nơi cùng số mục. */
export const proposalDocs = (p: ActionProposal): string[] => exactDocumentList((p.params?.documents as unknown[] | undefined) ?? []);
/** Tiêu đề hiện ra: yêu cầu bổ sung đếm lại theo danh sách đã gộp; loại khác bỏ nhãn loại ở đầu. */
export function proposalTitle(p: Pick<ActionProposal, 'kind' | 'title' | 'params'>): string {
  const docs = proposalDocs(p as ActionProposal);
  return p.kind === 'request_documents' && docs.length > 0 ? recountTitle(p.title, docs.length) : kindTitle(p.kind, p.title);
}
const KIND_ALIAS: Partial<Record<ProposalKind, RegExp>> = {
  add_disbursement_condition: /^\s*Bổ sung trước giải ngân\s*[:–—-]\s*(?=\S)/iu,
};
/** Tiêu đề không còn nội dung sau khi bỏ nhãn loại và câu "… 0 đồng" vô nghĩa thì dùng câu nghiệp vụ thay cho nhãn lặp. */
export function kindTitle(kind: ProposalKind, raw: string): string {
  const label = KIND_LABEL[kind] ?? '';
  // Tiêu đề do engine sinh hay mở bằng một nhãn loại khác chữ ("Bổ sung trước giải ngân: …" dưới nhãn "Điều kiện trước giải ngân"): chỉ bỏ nhãn lặp, giữ nội dung.
  const t = stripKindLabel(label, raw).replace(KIND_ALIAS[kind] ?? /^$/, '');
  if (t.trim().toLowerCase() !== label.toLowerCase()) return t;
  return kind === 'add_disbursement_condition' && /bảo đảm/i.test(raw) ? 'Chưa có tài sản bảo đảm được thẩm định' : '';
}

function ProposalCard({ proposal: p, caseId, loanId, shared }: { proposal: ActionProposal; caseId: string; loanId: string; shared: string[] }) {
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
      void qc.invalidateQueries({ queryKey: ['loan-overview', loanId] });
    },
  });
  const [color, label] = STATUS_TAG[p.status];
  const own = (p.evidence ?? []).filter((e) => !shared.includes(evidenceKey(e)));
  const docs = proposalDocs(p);
  return (
    <div data-testid="action-proposal" data-kind={p.kind} data-status={p.status}
      style={{ background: 'var(--surface)', border: '1px solid var(--rule-strong)', borderRadius: 'var(--r-md)', padding: 'var(--s3) var(--s4)', display: 'grid', gap: 'var(--s2)' }}>
      <div style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center', flexWrap: 'wrap' }}><AiTag>{KIND_LABEL[p.kind]}</AiTag><StatusPill tone={color}>{label}</StatusPill><b>{proposalTitle(p)}</b></div>
      <div style={{ fontSize: 'var(--fs-13)' }}>Căn cứ: <AiText text={rationaleText(p.kind, p.rationale)} /></div>
      {docs.length > 0 && <ul style={{ margin: 0, paddingLeft: 18, fontSize: 'var(--fs-13)' }}>{docs.map((d) => <li key={d}>{d}</li>)}</ul>}
      {own.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 'var(--fs-12)', color: 'var(--ink-2)' }}>
          {own.map((e, i) => (typeof e === 'string'
            ? <li key={i}>{cleanAiLine(e)}</li>
            : <li key={i}><b>{sourceLabel(e.source)}</b>{(() => { const { rest, joined } = sourceQuoteParts(sourceLabel(e.source), e.quote); return rest ? `${joined ? ' ' : ': '}${rest}` : ''; })()}</li>))}
        </ul>
      )}
      {p.status !== 'PROPOSED' && p.decided_reason && <div style={{ fontSize: 'var(--fs-12)' }}>Lý do của người xử lý: {p.decided_reason}</div>}
      {p.status === 'PROPOSED' && p.result && (p.result as { message?: string }).message && (
        <Alert type="warning" showIcon style={{ marginTop: 6 }} data-testid="proposal-refused"
          message={`Lần xác nhận trước bị từ chối: ${(p.result as { message?: string }).message}`} />
      )}
      {p.status === 'PROPOSED' && !canAct && (
        <div style={{ fontSize: 'var(--fs-12)', color: 'var(--ink-2)' }} data-testid="proposal-locked">Chỉ người đúng vai trò mới xác nhận hoặc bỏ được đề xuất này.</div>
      )}
      {p.status === 'PROPOSED' && canAct && mode === null && (
        <div style={{ display: 'flex', gap: 'var(--s2)' }}>
          <Button type="primary" size="small" data-testid="proposal-confirm" onClick={() => setMode('confirm')}>Xác nhận</Button>
          <Button size="small" data-testid="proposal-dismiss" onClick={() => setMode('dismiss')}>Bỏ đề xuất</Button>
        </div>
      )}
      {mode && (
        <div style={{ display: 'grid', gap: 'var(--s2)' }}>
          <Input.TextArea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} data-testid="proposal-reason"
            placeholder={mode === 'confirm' ? 'Lý do xác nhận (tối thiểu 5 ký tự)' : 'Lý do bỏ (tối thiểu 5 ký tự)'} />
          {act.isError && <Alert type="error" showIcon style={{ marginTop: 6 }} data-testid="proposal-error" message={normalizeError(act.error).message} />}
          <div style={{ display: 'flex', gap: 'var(--s2)' }}>
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

interface ChainRow { id: string; kind: ProposalKind; title: string; steps: { label: string; tone: PillTone; text: string }[] }

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
      row.steps.push({ label: 'Agent đề xuất', tone: 'ai', text: String(e.payload?.rationale ?? '') });
    } else if (e.type === 'action_confirmed') row.steps.push({ label: 'Người xác nhận', tone: 'human', text: String(e.payload?.reason ?? '') });
    else if (e.type === 'action_dismissed') row.steps.push({ label: 'Người bỏ đề xuất', tone: 'neutral', text: String(e.payload?.reason ?? '') });
    else if (e.type === 'action_executed') row.steps.push({ label: 'Hệ thống thực hiện', tone: 'ok', text: 'Đã ghi vào hồ sơ bằng quyền của người xác nhận, có nhật ký kiểm toán.' });
    else if (e.type === 'action_refused') row.steps.push({ label: 'Hệ thống từ chối', tone: 'bad', text: String(e.payload?.message ?? '') });
    rows.set(id, row);
  }
  return [...rows.values()];
}

/** `skipText`: các đoạn đã in ở nơi khác của ngăn kéo; lý do của bước nào giống chúng thì không in lại. */
export function ProposalChain({ events, skipText = [], caseId }: { events: AgentCaseEvent[]; skipText?: string[]; caseId?: string }) {
  const chains = proposalChains(events);
  // Cùng khóa truy vấn với thẻ đề xuất: tiêu đề "N mục" đếm lại bằng đúng danh sách tài liệu của thẻ.
  const q = useQuery({ queryKey: ['agent-proposals', caseId], queryFn: () => getActionProposals(caseId!), enabled: !!caseId });
  if (chains.length === 0) return null;
  return (
    <section data-testid="trace-proposals" style={{ marginTop: 12 }}>
      <h3 style={{ margin: '0 0 6px' }}>Hành động đề xuất và xác nhận</h3>
      {chains.map((c, n) => {
        const label = KIND_LABEL[c.kind] ?? String(c.kind ?? '');
        const real = q.data?.find((p) => p.id === c.id);
        const title = real && c.kind === 'request_documents' && proposalDocs(real).length > 0 ? proposalTitle(real) : kindTitle(c.kind, c.title);
        return (
        <div key={c.id} data-testid="trace-proposal-chain" style={{ fontSize: 13, marginBottom: 8 }}>
          {n + 1}. <b>{label}</b>{title ? `: ${c.kind === 'request_documents' ? withListHint(title) : title}` : ''}
          {c.steps.map((s, i) => (
            <div key={i} style={{ marginLeft: 12 }}><StatusPill tone={s.tone}>{s.label}</StatusPill> {skipText.some((t) => coversAiText(t, s.text)) ? '' : rationaleText(c.kind, s.text)}</div>
          ))}
        </div>
        );
      })}
    </section>
  );
}
