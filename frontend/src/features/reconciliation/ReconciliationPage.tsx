import { loanCodeLabel } from '@/components/common/CodeText';
import { Alert, Skeleton } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { UploadPanel } from './UploadPanel';
import { RequireRole } from '@/auth/RequireRole';
import { StateBlock } from '@/components/ui';
import { PageError } from '@/components/common/PageError';
import { normalizeError } from '@/services/apiClient';
import { PageHead } from '@/features/shell/PageHead';
import { ChecklistPanel } from './ChecklistPanel';
import { ConflictPanel } from './ConflictPanel';
import { DocumentViewer } from './DocumentViewer';
import { LogPanel } from './LogPanel';
import { TransferBar } from './TransferBar';
import { fetchReconciliation } from './reconciliationService';
import { statusLabel } from '@/features/my-work/format';
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
  const code = loanCodeLabel(view.application_number, view.status);
  const openDocument = (id: string) => { setDocumentId(id); setFieldId(null); };
  const current = documentId ?? view.documents[0]?.document_id ?? null;

  return (
    <>
      <PageHead
        title={`Đối chiếu tài liệu · ${view.customer_name ?? code}`}
        facts={[code, statusLabel(view.status)]}
        crumbs={[{ label: 'Việc của tôi', to: '/viec-cua-toi' }, { label: code, to: `/ho-so-vay/${loanId}` }, { label: 'Đối chiếu tài liệu' }]}
      />
      <div className={styles.page}>
        <p className={styles.noteBar} data-testid="recon-note">
          Tài liệu mẫu là dữ liệu minh họa. Tài liệu tải lên được hệ thống đọc tự động: trường trích ra là đề xuất của AI, chỉ có hiệu lực sau khi người xác nhận.
        </p>
        {view.documents.length === 0 && (
          <Alert type="warning" showIcon data-testid="recon-next-line"
            message="Hồ sơ chưa có tài liệu nào"
            description={view.permissions.can_upload
              ? 'Bước tiếp theo: tải PDF theo từng mục trong danh mục tài liệu ở khung "Tải tài liệu lên" bên dưới.'
              : 'Bước tiếp theo: chờ QHKH tải tài liệu lên. Bạn sẽ đối chiếu khi có tài liệu.'} />
        )}
        <div className={styles.cols}>
          <div className={styles.stack}>
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
            <section className={styles.panel} aria-label="Tài liệu đang xem">
              <StateBlock kind="empty" compact title="Chưa có tài liệu để đối chiếu" description="Khi tài liệu được tải lên, bạn xem nội dung và các trường AI trích xuất ở đây." />
            </section>
          )}
          <div className={styles.stack}>
            <ConflictPanel
              loanId={loanId}
              conflicts={view.conflicts}
              canResolve={view.permissions.can_resolve}
              onOpenField={(docId, fId) => { setDocumentId(docId); setFieldId(fId); }}
            />
            <TransferBar loanId={loanId} transfer={view.transfer} onDone={reload} />
          </div>
        </div>
        <LogPanel loanId={loanId} items={view.items} />
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
