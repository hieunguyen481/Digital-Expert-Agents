import { Alert, Button, Skeleton } from 'antd';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RequireRole } from '@/auth/RequireRole';
import { PageError } from '@/components/common/PageError';
import { useAiPanel } from '@/features/ai-panel/AiPanelContext';
import { PageHead } from '@/features/shell/PageHead';
import { statusLabel } from '@/features/my-work/format';
import { DocumentsSection } from './DocumentsSection';
import { ProposalFrame, type CheckItem } from './ProposalFrame';
import { billionToVnd, validateAmount, validateTerm } from './draftForm';
import { NeedSection } from './NeedSection';
import { RelatedSection } from './RelatedSection';
import { SummarySection } from './SummarySection';
import { ConflictBanner, SaveStatusText } from './SaveStatus';
import { fetchProducts } from './proposalService';
import styles from './proposal.module.css';
import { useDraftAutosave } from './useDraftAutosave';

type SectionKey = 'need' | 'docs' | 'related' | 'summary';
const SECTIONS: Array<{ key: SectionKey; label: string }> = [
  { key: 'need', label: 'Nhu cầu vay' },
  { key: 'docs', label: 'Hồ sơ tài liệu' },
  { key: 'related', label: 'Nhóm liên quan và tài sản' },
  { key: 'summary', label: 'Tóm tắt và gửi' },
];

function Editor({ loanId }: { loanId: string }) {
  const { draft, form, loadError, state, change, saveNow, reload } = useDraftAutosave(loanId);
  const products = useQuery({ queryKey: ['loan-products'], queryFn: fetchProducts });
  const { openWith } = useAiPanel();
  const [section, setSection] = useState<SectionKey>('need');

  const head = (
    <PageHead
      title={draft ? `Đề xuất vay · ${draft.customer_name ?? draft.application_number}` : 'Đề xuất vay'}
      facts={[`Bước ${SECTIONS.findIndex((s) => s.key === section) + 1} trên ${SECTIONS.length}: ${SECTIONS.find((s) => s.key === section)?.label}`, draft?.application_number, draft ? (draft.status === 'DRAFT' ? 'Bản nháp' : statusLabel(draft.status)) : null]}
      crumbs={[{ label: 'Việc của tôi', to: '/viec-cua-toi' }, { label: draft?.application_number ?? 'Đề xuất' }, { label: 'Soạn đề xuất' }]}
      onAskAi={() => openWith({ type: 'session', id: 'proposal', label: 'Đề xuất đang soạn' })}
      actions={
        <>
          <SaveStatusText state={state} />
          <Button onClick={() => void saveNow()} disabled={!draft?.editable || state.kind === 'conflict'}>
            Lưu nháp
          </Button>
        </>
      }
    />
  );

  if (loadError) return (<>{head}<PageError title="Không tải được đề xuất" error={{ code: 'LOAD', message: loadError }} onRetry={() => void reload()} /></>);
  if (!draft || !form || !products.data) return (<>{head}<div className={styles.page} aria-busy><Skeleton active /></div></>);

  const amountErr = validateAmount(form.amountBillion);
  const termErr = validateTerm(form.termMonths);
  const checks: CheckItem[] = [
    { label: 'Sản phẩm', ok: !!form.productId, hint: 'Chọn sản phẩm ở bước Nhu cầu vay.' },
    { label: 'Số tiền đề nghị', ok: !!billionToVnd(form.amountBillion) && !amountErr, hint: amountErr ?? 'Nhập số tiền ở bước Nhu cầu vay.' },
    { label: 'Kỳ hạn', ok: /^\d+$/.test(form.termMonths.trim()) && !termErr, hint: termErr ?? 'Nhập số tháng ở bước Nhu cầu vay.' },
  ];
  const idx = SECTIONS.findIndex((s) => s.key === section);
  const next = SECTIONS[idx + 1];

  return (
    <>
      {head}
      <div className={styles.page}>
        <ConflictBanner state={state} onReload={() => void reload()} />
        {!draft.editable && <Alert type="info" showIcon message="Đề xuất đã gửi; nội dung chỉ để xem." />}
        <ProposalFrame
          steps={SECTIONS}
          current={section}
          onSelect={(k) => setSection(k as SectionKey)}
          checks={checks}
          footer={
            next ? (
              <Button type="primary" onClick={() => setSection(next.key)}>
                Tiếp: {next.label}
              </Button>
            ) : undefined
          }
        >
          {section === 'need' && (
            <NeedSection form={form} products={products.data} disabled={!draft.editable || state.kind === 'conflict'} onChange={change} />
          )}
          {section === 'docs' && <DocumentsSection loanId={loanId} customerId={draft?.primary_customer_id ?? ''} />}
          {section === 'related' && <RelatedSection loanId={loanId} />}
          {section === 'summary' && (
            <SummarySection
              loanId={loanId}
              blocked={state.kind === 'conflict'}
              saveNow={saveNow}
              onGoto={(s) => setSection(s === 'collateral' ? 'related' : (s as SectionKey))}
              onSubmitted={() => void reload()}
            />
          )}
        </ProposalFrame>
      </div>
    </>
  );
}

export default function ProposalPage() {
  const { loanId } = useParams<{ loanId: string }>();
  return (
    <RequireRole allow={['qhkh']} pageName="Tạo đề xuất vay">
      {loanId ? <Editor loanId={loanId} key={loanId} /> : null}
    </RequireRole>
  );
}
