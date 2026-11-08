import { Alert, Button, Space, Tag, Typography } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getErrorMessage } from '@/services/apiClient';
import { confirmField, fetchPageImageUrl, fetchReconDocument } from './reconciliationService';
import { fieldStatusLabel, highlightStyle, needsHuman } from './fieldStatus';
import type { ReconField } from './types';
import styles from './reconciliation.module.css';

interface Props {
  loanId: string;
  documentId: string;
  selectedFieldId: string | null;
  onSelect: (fieldId: string | null) => void;
  canConfirm: boolean;
  onChanged: () => void;
}

/**
 * Xem một tài liệu: vùng tô trên khung trang và trường trích xuất liên kết hai chiều qua `selectedFieldId`.
 * Q-U: mặc định một thẻ cho trường đang chọn, kèm liên kết "n trường khác trên trang này".
 * Tài liệu tải lên (PIPELINE) có ảnh trang do worker dựng; tài liệu seed thì khung trang chỉ đặt vùng tô theo toạ độ ở DB.
 */
export function DocumentViewer({ loanId, documentId, selectedFieldId, onSelect, canConfirm, onChanged }: Props) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['recon-document', loanId, documentId],
    queryFn: () => fetchReconDocument(loanId, documentId),
    refetchInterval: (query) => {
      const d = query.state.data?.document;
      return d?.data_source === 'PIPELINE' && !['READY', 'NEEDS_HUMAN_REVIEW', 'FAILED'].includes(d.processing_status ?? '') ? 3000 : false;
    },
  });
  const [page, setPage] = useState(1);
  const versionId = q.data?.document.version_id ?? null;
  const hasImage = q.data?.has_page_image ?? false;
  const img = useQuery({
    queryKey: ['recon-page-image', versionId, page],
    queryFn: () => fetchPageImageUrl(versionId as string, page),
    enabled: hasImage && versionId !== null,
    staleTime: 5 * 60_000,
  });
  const [showOthers, setShowOthers] = useState(false);
  const regionRefs = useRef(new Map<string, HTMLButtonElement>());

  const fields = q.data?.fields ?? [];
  const selected = fields.find((f) => f.field_id === selectedFieldId) ?? null;

  // Mở tài liệu ở trang có trường đầu tiên (không bắt người xem lật từng trang tìm vùng tô).
  const firstFieldPage = fields.reduce<number | null>(
    (min, f) => (f.page_number && (min === null || f.page_number < min) ? f.page_number : min), null);
  useEffect(() => {
    if (firstFieldPage && !selectedFieldId) setPage(firstFieldPage);
  }, [firstFieldPage, selectedFieldId]);
  useEffect(() => {
    if (selected?.page_number) setPage(selected.page_number);
  }, [selected?.field_id, selected?.page_number]);
  useEffect(() => {
    if (selected) regionRefs.current.get(selected.field_id)?.scrollIntoView?.({ block: 'nearest' });
  }, [selected?.field_id]);

  const confirm = useMutation({
    mutationFn: (f: ReconField) => confirmField(f.field_id, 'Đã đối chiếu với tài liệu gốc'),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['recon-document', loanId, documentId] });
      void qc.invalidateQueries({ queryKey: ['reconciliation', loanId] });
      onChanged();
    },
  });

  const onPage = useMemo(() => fields.filter((f) => (f.page_number ?? 1) === page), [fields, page]);
  if (q.isError) return <Alert type="error" showIcon message={getErrorMessage(q.error)} />;
  if (!q.data) return <div aria-busy>Đang tải tài liệu…</div>;
  const doc = q.data.document;
  const others = onPage.filter((f) => f.field_id !== selected?.field_id);

  return (
    <section className={styles.panel} aria-label="Tài liệu đang xem">
      <h2>{doc.title ?? doc.document_type}</h2>
      {doc.data_source === 'PIPELINE' && doc.processing_error && (
        <Alert type="error" showIcon data-testid="processing-error" message={doc.processing_error} />
      )}
      {doc.data_source === 'PIPELINE' && !doc.processing_error
        && !['READY', 'NEEDS_HUMAN_REVIEW'].includes(doc.processing_status ?? '') && (
        <Alert type="info" showIcon data-testid="processing-progress"
          message={`Worker đang xử lý tài liệu (${doc.processing_progress ?? 0}%)…`} />
      )}
      {doc.page_count > 1 && (
        <Space size={4} style={{ marginBottom: 8 }}>
          {Array.from({ length: doc.page_count }, (_, i) => i + 1).map((n) => (
            <Button key={n} size="small" type={n === page ? 'primary' : 'default'} onClick={() => setPage(n)}>
              Trang {n}
            </Button>
          ))}
        </Space>
      )}
      <div className={styles.pageFrame} data-testid="page-frame" aria-label={`Trang ${page}`}
        data-source={doc.data_source} style={img.data ? { aspectRatio: 'auto' } : undefined}>
        {img.data && <img src={img.data} alt={`Trang ${page} của ${doc.title ?? 'tài liệu'}`} className={styles.pageImage} />}
        {onPage.map((f) => {
          const style = highlightStyle(f);
          if (!style) return null;
          return (
            <button
              key={f.field_id}
              type="button"
              ref={(el) => {
                if (el) regionRefs.current.set(f.field_id, el);
              }}
              className={styles.region}
              style={style}
              aria-pressed={f.field_id === selectedFieldId}
              aria-label={`Vùng tô: ${f.field_name}`}
              data-testid={`region-${f.field_id}`}
              onClick={() => onSelect(f.field_id)}
            >
              <span className={styles.regionText}>{f.field_name}</span>
            </button>
          );
        })}
      </div>
      <p className={styles.note} data-testid="source-note">
        {doc.data_source === 'PIPELINE'
          ? 'Nguồn: tệp tải lên, trường do AI trích từ lớp chữ của PDF; vùng tô là vị trí dòng nguồn trên trang.'
          : 'Nguồn: dữ liệu seed (chưa có ảnh trang thật); vùng tô là dữ liệu seed.'}
      </p>

      {selected ? (
        <FieldCard
          field={selected}
          canConfirm={canConfirm}
          busy={confirm.isPending}
          error={confirm.isError ? getErrorMessage(confirm.error) : null}
          onConfirm={() => confirm.mutate(selected)}
        />
      ) : (
        <p>Chọn một trường hoặc một vùng tô để xem chi tiết.</p>
      )}
      {others.length > 0 && (
        <>
          <Button type="link" style={{ padding: 0 }} onClick={() => setShowOthers((v) => !v)} aria-expanded={showOthers}>
            {others.length} trường khác trên trang này
          </Button>
          {showOthers && (
            <div role="list" aria-label="Các trường khác trên trang">
              {others.map((f) => (
                <button
                  key={f.field_id}
                  type="button"
                  role="listitem"
                  className={styles.fieldRow}
                  data-testid={`field-row-${f.field_id}`}
                  aria-current={f.field_id === selectedFieldId}
                  onClick={() => onSelect(f.field_id)}
                >
                  <span>{f.field_name}</span>
                  <span>{f.value ?? '—'}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function FieldCard({
  field, canConfirm, busy, error, onConfirm,
}: { field: ReconField; canConfirm: boolean; busy: boolean; error: string | null; onConfirm: () => void }) {
  const label = fieldStatusLabel(field);
  return (
    <div className={styles.source} data-testid="field-card">
      <Typography.Text strong>{field.field_name}</Typography.Text>
      <span data-testid="field-card-value">{field.value ?? '—'}</span>
      <Tag color={label.color} style={{ width: 'fit-content' }}>{label.text}</Tag>
      {field.source_text && <span className={styles.note}>Nguồn trích: {field.source_text}</span>}
      {field.confidence != null && <span className={styles.note}>Độ tin cậy do AI báo: {Math.round(field.confidence * 100)}%</span>}
      {needsHuman(field) && canConfirm && (
        <Button size="small" onClick={onConfirm} loading={busy}>Tôi đã đối chiếu, xác nhận giá trị</Button>
      )}
      {error && <Alert type="error" showIcon message={error} />}
    </div>
  );
}
