import { Alert, Button, Menu, Skeleton } from 'antd';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RequireRole } from '@/auth/RequireRole';
import { PageError } from '@/components/common/PageError';
import { useAiPanel } from '@/features/ai-panel/AiPanelContext';
import { PageHead } from '@/features/shell/PageHead';
import { DocumentsSection } from './DocumentsSection';
import { NeedSection } from './NeedSection';
import { ConflictBanner, SaveStatusText } from './SaveStatus';
import { fetchProducts } from './proposalService';
import styles from './proposal.module.css';
import { useDraftAutosave } from './useDraftAutosave';

type SectionKey = 'need' | 'docs';
const SECTIONS: Array<{ key: SectionKey; label: string }> = [
  { key: 'need', label: 'Nhu cầu vay' },
  { key: 'docs', label: 'Hồ sơ tài liệu' },
];

function Editor({ loanId }: { loanId: string }) {
  const { draft, form, loadError, state, change, saveNow, reload } = useDraftAutosave(loanId);
  const products = useQuery({ queryKey: ['loan-products'], queryFn: fetchProducts });
  const { openWith } = useAiPanel();
  const [section, setSection] = useState<SectionKey>('need');

  const head = (
    <PageHead
      title={draft ? `Đề xuất vay · ${draft.customer_name ?? draft.application_number}` : 'Đề xuất vay'}
      facts={[draft?.application_number, draft && draft.status === 'DRAFT' ? 'Bản nháp' : draft?.status]}
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
          <main className={styles.content} tabIndex={-1}>
            {section === 'need' && (
              <NeedSection
                form={form}
                products={products.data}
                disabled={!draft.editable || state.kind === 'conflict'}
                onChange={change}
              />
            )}
            {section === 'docs' && <DocumentsSection loanId={loanId} />}
          </main>
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
