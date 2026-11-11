import { useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Space, Tag, Typography } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMe } from '@/auth/session';
import { DECISION_LABEL, agentName, approverLevelLabel, sourceLabel, stateLabel } from '@/features/dashboard/agentTrace';
import {
  TERMINAL_STATES,
  type AgentVerdict,
  confirmAgentCase,
  getAgentCase,
  getAgentCaseEvents,
  streamAgentCase,
} from '@/services/agentCaseService';

const VND = (v: number) => `${v.toLocaleString('vi-VN')} VND`;

export interface EnginePanelProps {
  caseId: string;
  loanApplicationId?: string;
}

/** Kết quả hội đồng multi-agent thật: kế hoạch, ý kiến chuyên gia, nguồn, thẻ xác nhận của người có thẩm quyền. */
export function EnginePanel({ caseId, loanApplicationId }: EnginePanelProps) {
  const qc = useQueryClient();
  const me = useMe();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const caseQ = useQuery({ queryKey: ['agent-case', caseId], queryFn: () => getAgentCase(caseId) });
  const eventsQ = useQuery({ queryKey: ['agent-case-events', caseId], queryFn: () => getAgentCaseEvents(caseId) });
  const state = caseQ.data?.state;
  const inFlight = !!state && !TERMINAL_STATES.includes(state);

  // Hội đồng đang chạy: nhận sự kiện qua fetch streaming (header Authorization), xong thì đóng.
  useEffect(() => {
    if (!inFlight) return undefined;
    const ctrl = new AbortController();
    streamAgentCase(caseId, () => {
      void qc.invalidateQueries({ queryKey: ['agent-case', caseId] });
      void qc.invalidateQueries({ queryKey: ['agent-case-events', caseId] });
    }, ctrl.signal).catch(() => undefined);
    return () => ctrl.abort();
  }, [caseId, inFlight, qc]);

  if (caseQ.isError) {
    return <Alert type="warning" showIcon message="Không tải được kết quả đội agent" description="Bạn có thể không có quyền xem hồ sơ phân tích này." />;
  }
  const c = caseQ.data;
  if (!c) return <Alert type="info" message="Đang tải kết quả đội agent…" />;

  const pkg = c.package ?? {};
  const events = eventsQ.data ?? [];
  // Chỉ hồ sơ đạt mới có gói phê duyệt; khi dừng ở Cần bổ sung/Từ chối vẫn phải thấy ý kiến từng agent.
  const verdicts: AgentVerdict[] =
    pkg.verdicts ??
    events
      .filter((e) => e.type === 'task_finished' && e.payload?.verdict)
      .map((e) => e.payload!.verdict as AgentVerdict);
  const sources = verdicts.flatMap((v) => (v.evidence ?? []).map((e) => ({ agent: v.agent, ...e })));
  const roles = me.data?.roles ?? [];
  const canDecide = roles.includes('loan_approver');
  const stopEvent = [...events].reverse().find((e) => e.type === 'state_changed' && e.payload?.state === c.state);
  const stopReason = typeof stopEvent?.payload?.reason === 'string' ? stopEvent.payload.reason : undefined;
  const stopFindings = Array.isArray(stopEvent?.payload?.findings) ? (stopEvent!.payload!.findings as string[]) : [];
  const flow = events.filter((e) => e.type === 'task_finished' || e.type === 'plan_created');

  const decide = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!loanApplicationId) return;
    setBusy(true);
    setError(null);
    try {
      await confirmAgentCase(caseId, {
        loan_application_id: loanApplicationId,
        decision_type: decision,
        reason: reason.trim(),
        approver_level: pkg.required_approver_level,
        approved_amount: pkg.proposed_limit,
      });
      setDone(true);
      await qc.invalidateQueries({ queryKey: ['agent-case', caseId] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thực hiện được quyết định');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card size="small" data-testid="engine-panel" style={{ marginTop: 12 }} title={`Đội agent · ${stateLabel(c.state)}`}>
      <Space size={[4, 4]} wrap data-testid="engine-flow">
        {flow.map((e) => (
          <Tag key={e.id} color={e.type === 'plan_created' ? 'blue' : 'green'}>
            {agentName(e.agent)}
          </Tag>
        ))}
      </Space>
      <div data-testid="engine-verdicts" style={{ marginTop: 8 }}>
        {verdicts.map((v) => (
          <div key={v.agent + v.summary}>
            <b>{agentName(v.agent)}</b>: {DECISION_LABEL[v.decision] ?? v.decision} — {v.summary}
          </div>
        ))}
      </div>
      {sources.length > 0 && (
        <details data-testid="engine-sources" style={{ marginTop: 8 }}>
          <summary>Nguồn trích dẫn ({sources.length})</summary>
          <ul>
            {sources.map((s, i) => (
              <li key={i}>
                <Typography.Text strong>{sourceLabel(s.source)}</Typography.Text> {s.quote}
              </li>
            ))}
          </ul>
          <details>
            <summary>Chi tiết kỹ thuật (kiểm toán)</summary>
            {sources.map((s, i) => (
              <div key={i}>{s.source}: {s.raw_quote ?? s.quote}</div>
            ))}
          </details>
        </details>
      )}
      {(c.state === 'Needs Info' || c.state === 'Rejected') && (
        <Alert
          style={{ marginTop: 12 }}
          type={c.state === 'Rejected' ? 'error' : 'info'}
          showIcon
          data-testid="stop-card"
          message={
            c.state === 'Rejected'
              ? 'Đội agent đề xuất từ chối — người có thẩm quyền quyết định'
              : 'Đội agent đề nghị bổ sung hồ sơ trước khi trình — chưa tới bước phê duyệt'
          }
          description={
            <div>
              {stopReason && <div>{stopReason}</div>}
              {stopFindings.map((f) => (
                <div key={f}>• {f}</div>
              ))}
            </div>
          }
        />
      )}
      {c.state === 'Pending Approval' && (
        <Alert
          style={{ marginTop: 12 }}
          type="warning"
          showIcon
          data-testid="confirm-card"
          message="Đang chờ người có thẩm quyền xác nhận — agent không tự phê duyệt"
          description={
            <div>
              <div>
                {pkg.proposed_limit ? `Hạn mức đề xuất: ${VND(pkg.proposed_limit)}` : 'Chưa có hạn mức đề xuất'}
                {pkg.required_approver_level ? ` · Cấp phê duyệt: ${approverLevelLabel(pkg.required_approver_level)}` : ''}
              </div>
              {(pkg.conditions ?? []).map((cond) => (
                <div key={cond}>• {cond}</div>
              ))}
              {canDecide && loanApplicationId && !done ? (
                <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
                  <Input.TextArea rows={2} value={reason} onChange={(ev) => setReason(ev.target.value)} placeholder="Lý do quyết định (bắt buộc)" />
                  <Space>
                    <Button type="primary" disabled={!reason.trim() || busy} loading={busy} onClick={() => void decide('APPROVED')}>
                      Xác nhận phê duyệt
                    </Button>
                    <Button danger disabled={!reason.trim() || busy} onClick={() => void decide('REJECTED')}>
                      Từ chối
                    </Button>
                  </Space>
                </Space>
              ) : (
                <div style={{ marginTop: 8 }}>Bạn không có thẩm quyền phê duyệt; chuyển hồ sơ cho người duyệt.</div>
              )}
              {error && <Alert style={{ marginTop: 8 }} type="error" message={error} />}
            </div>
          }
        />
      )}
    </Card>
  );
}
