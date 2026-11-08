import { Alert, Skeleton } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { UploadPanel } from './UploadPanel';
import { RequireRole } from '@/auth/RequireRole';
import { PageError } from '@/components/common/PageError';
import { normalizeError } from '@/services/apiClient';
import { PageHead } from '@/features/shell/PageHead';
import { ChecklistPanel } from './ChecklistPanel';
import { ConflictPanel } from './ConflictPanel';
import { DocumentViewer } from './DocumentViewer';
import { LogPanel } from './LogPanel';
import { TransferBar } from './TransferBar';
import { fetchReconciliation } from './reconciliationService';
import styles from './reconciliation.module.css';

function Workspace({ loanId }: { loanId: string }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['reconciliation', loanId], queryFn: () => fetchReconciliation(loanId),
    // Worker đang xử lý thì hỏi lại để thấy tiến độ / thất bại / trường mới.
    refetchInterval: (query) =>
      query.state.data?.documents.some((d) => d.data_source === 'PIPELINE' && !['READY', 'NEEDS_HUMAN_REVIEW', 'FAILED'].includes(d.processing_status ?? '')) ? 3000 : false,
  });
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [fieldId, setFieldId] = useState<string | null>(null);
  const reload = useCallback(() => void qc.invalidateQueries({ queryKey: ['reconciliation', loanId] }), [qc, loanId]);

  if (q.isError) return <PageError title="Không tải được hồ sơ" error={normalizeError(q.error)} onRetry={() => void q.refetch()} />;
  if (!q.data) return <div className={styles.page} aria-busy><Skeleton active /></div>;
  const view = q.data;
  const openDocument = (id: string) => { setDocumentId(id); setFieldId(null); };
  const current = documentId ?? view.documents[0]?.document_id ?? null;

  return (
    <>
      <PageHead
        title={`Đối chiếu tài liệu · ${view.customer_name ?? view.application_number}`}
        facts={[view.application_number, view.status === 'CHECKING' ? 'Đang hậu kiểm' : view.status]}
      />
      <div className={styles.page}>
        <Alert type="info" showIcon message={view.data_label} />
        <div className={styles.cols}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ChecklistPanel loanId={loanId} view={view} documentId={current} onOpenDocument={openDocument} />
            <UploadPanel loanId={loanId} view={view} onUploaded={(id) => { reload(); openDocument(id); }} />
          </div>
          {current ? (
            <DocumentViewer
              key={current}
              loanId={loanId}
              documentId={current}
              selectedFieldId={fieldId}
              onSelect={setFieldId}
              canConfirm={view.permissions.can_confirm_fields}
              onChanged={reload}
            />
          ) : (
            <section className={styles.panel}>Hồ sơ chưa có tài liệu.</section>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ConflictPanel
              loanId={loanId}
              conflicts={view.conflicts}
              canResolve={view.permissions.can_resolve}
              onOpenField={(docId, fId) => { setDocumentId(docId); setFieldId(fId); }}
            />
            <TransferBar loanId={loanId} transfer={view.transfer} onDone={reload} />
          </div>
        </div>
        <LogPanel loanId={loanId} />
      </div>
    </>
  );
}

export default function ReconciliationPage() {
  const { loanId } = useParams<{ loanId: string }>();
  return (
    <RequireRole allow={['qhkh', 'httd', 'tdinh']} pageName="Đối chiếu tài liệu">
      {loanId ? <Workspace loanId={loanId} key={loanId} /> : null}
    </RequireRole>
  );
}
