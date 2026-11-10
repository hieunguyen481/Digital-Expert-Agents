import { Alert, Button, Menu, Skeleton } from 'antd';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RequireRole } from '@/auth/RequireRole';
import { PageError } from '@/components/common/PageError';
import { useAiPanel } from '@/features/ai-panel/AiPanelContext';
import { PageHead } from '@/features/shell/PageHead';
import { statusLabel } from '@/features/my-work/format';
import { DocumentsSection } from './DocumentsSection';
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
      facts={[draft?.application_number, draft ? (draft.status === 'DRAFT' ? 'Bản nháp' : statusLabel(draft.status)) : null]}
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

  return (
    <>
      {head}
      <div className={styles.page}>
        <ConflictBanner state={state} onReload={() => void reload()} />
        {!draft.editable && <Alert type="info" showIcon message="Đề xuất đã gửi; nội dung chỉ để xem." />}
        <div className={styles.ws}>
          <Menu
            mode="inline"
            selectedKeys={[section]}
            items={SECTIONS}
            onClick={(e) => setSection(e.key as SectionKey)}
            aria-label="Các bước soạn đề xuất"
            className={styles.toc}
          />
          <div className={styles.content}>
            {section === 'need' && (
              <NeedSection
                form={form}
                products={products.data}
                disabled={!draft.editable || state.kind === 'conflict'}
                onChange={change}
              />
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
          </div>
        </div>
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
