import { Alert, Button, Input, Space, Tag, Typography } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getErrorMessage } from '@/services/apiClient';
import { confirmConsent, fetchCic, fetchProposalDocuments, lookupCic } from './proposalService';
import type { CicStatus, ProposalDocument } from './types';

const fmt = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '');

const STATE_LABEL: Record<ProposalDocument['state'], { text: string; color: string }> = {
  OK: { text: 'Đã đủ', color: 'success' },
  AI: { text: 'AI xếp, chưa xác nhận', color: 'processing' },
  MISSING: { text: 'Thiếu', color: 'error' },
  EXPIRED: { text: 'Hết hiệu lực', color: 'error' },
};

const CIC_CODES = new Set(['CIC_REPORT', 'CREDIT_REPORT']);

function ConsentForm({ loanId, documentId, onDone }: { loanId: string; documentId: string; onDone: () => void }) {
  const [signed, setSigned] = useState('');
  const [until, setUntil] = useState('');
  const save = useMutation({
    mutationFn: () => confirmConsent(loanId, { document_id: documentId, signed_on: signed, valid_until: until || null }),
    onSuccess: onDone,
  });
  return (
    <Space direction="vertical" size={8} style={{ marginTop: 8 }}>
      <Space wrap>
        <label>
          Ngày ký <Input type="date" value={signed} onChange={(e) => setSigned(e.target.value)} style={{ width: 160 }} />
        </label>
        <label>
          Hạn ghi trên văn bản (bỏ trống nếu không ghi)
          <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} style={{ width: 160 }} />
        </label>
        <Button disabled={!signed || save.isPending} loading={save.isPending} onClick={() => save.mutate()}>
          Tôi đã đọc và xác nhận văn bản đồng ý
        </Button>
      </Space>
      {save.isError && <Alert type="error" showIcon message={getErrorMessage(save.error)} />}
    </Space>
  );
}

function CicBlock({ loanId, cic, consentDocId, onChanged }: { loanId: string; cic: CicStatus; consentDocId: string | null; onChanged: () => void }) {
  const lookup = useMutation({ mutationFn: () => lookupCic(loanId), onSuccess: onChanged });
  const locked = cic.lookup_locked;
  return (
    <section aria-label="Tra cứu CIC" style={{ border: '1px solid var(--ant-color-border-secondary)', borderRadius: 10, padding: 16 }}>
      <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
        <Typography.Title level={5} style={{ margin: 0 }}>Tra cứu CIC</Typography.Title>
        <Button
          aria-disabled={locked || lookup.isPending}
          title={locked ? (cic.lock_reason ?? undefined) : undefined}
          loading={lookup.isPending}
          onClick={() => { if (!locked) lookup.mutate(); }}
        >
          Tra cứu CIC mới
        </Button>
      </Space>
      <p style={{ margin: '8px 0 0' }}>
        {cic.report
          ? `Tra cứu ${fmt(cic.report.looked_up_on)}${cic.report.looked_up_by_name ? ` · ${cic.report.looked_up_by_name}` : ''} · ${
              cic.report_status === 'EXPIRED' ? 'đã hết hiệu lực từ' : 'hiệu lực đến hết'
            } ${fmt(cic.report.valid_until)}`
          : 'Chưa có kết quả tra cứu CIC.'}{' '}
        {cic.report?.source === 'SIMULATED' && <Tag color="warning">{cic.report.source_label ?? 'Dữ liệu mô phỏng'}</Tag>}
      </p>
      {cic.report_status === 'EXPIRED' && <Tag color="error">Hết hiệu lực</Tag>}
      {cic.relookup_flag_text && <Tag color="warning">{cic.relookup_flag_text}</Tag>}
      <p style={{ margin: '8px 0 0' }}>
        Văn bản đồng ý:{' '}
        {cic.consent.usable
          ? `đã xác nhận${cic.consent.confirmed_by_name ? ` bởi ${cic.consent.confirmed_by_name}` : ''}, ${
              cic.consent.valid_until ? `có hiệu lực đến ${fmt(cic.consent.valid_until)}` : 'có hiệu lực suốt hồ sơ'
            }`
          : (cic.consent.lock_reason ?? 'chưa dùng được')}
      </p>
      {cic.editable && !cic.consent.usable && cic.consent.code !== 'EXPIRED' && consentDocId && (
        <ConsentForm loanId={loanId} documentId={consentDocId} onDone={onChanged} />
      )}
      {lookup.isError && <Alert style={{ marginTop: 8 }} type="error" showIcon message={getErrorMessage(lookup.error)} />}
    </section>
  );
}

export function DocumentsSection({ loanId }: { loanId: string }) {
  const qc = useQueryClient();
  const docs = useQuery({ queryKey: ['proposal-documents', loanId], queryFn: () => fetchProposalDocuments(loanId) });
  const cic = useQuery({ queryKey: ['proposal-cic', loanId], queryFn: () => fetchCic(loanId) });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['proposal-cic', loanId] });
    void qc.invalidateQueries({ queryKey: ['proposal-documents', loanId] });
    void qc.invalidateQueries({ queryKey: ['proposal-conditions', loanId] });
  };
  if (docs.isError || cic.isError) return <Alert type="error" showIcon message={getErrorMessage(docs.error ?? cic.error)} />;
  if (!docs.data || !cic.data) return <div aria-busy>Đang tải hồ sơ tài liệu…</div>;
  const consentDoc = docs.data.find((d) => d.document_type === 'CIC_CONSENT')?.document_id ?? null;
  const left = docs.data.filter((d) => d.mandatory && d.state !== 'OK' && !d.has_exception).length;
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Alert
        type={left ? 'warning' : 'success'}
        showIcon
        message={left ? `Còn ${left} mục bắt buộc chưa đủ, hết hiệu lực hoặc chưa xác nhận` : 'Đủ các mục bắt buộc'}
        description="Tải lên và AI tự phân loại tài liệu làm ở giai đoạn sau; ở đây xem tình trạng và xử lý văn bản đồng ý, CIC."
      />
      <CicBlock loanId={loanId} cic={cic.data} consentDocId={consentDoc} onChanged={refresh} />
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} aria-label="Danh mục tài liệu">
        {docs.data
          .filter((d) => !CIC_CODES.has(d.document_type ?? ''))
          .map((d) => {
            const s = STATE_LABEL[d.state];
            return (
              <li key={d.item_id} data-testid={`doc-${d.code}`} style={{ padding: '10px 0', borderBottom: '1px solid var(--ant-color-border-secondary)' }}>
                <Space wrap>
                  <Tag color={s.color}>{s.text}</Tag>
                  <b>{d.title ?? d.code}</b>
                  {!d.mandatory && <Tag>Có điều kiện</Tag>}
                  {d.valid_until && <span>hiệu lực đến {fmt(d.valid_until)}</span>}
                  {d.has_exception && <Tag color="warning">Đã đề xuất ngoại lệ</Tag>}
                </Space>
              </li>
            );
          })}
      </ul>
    </Space>
  );
}
