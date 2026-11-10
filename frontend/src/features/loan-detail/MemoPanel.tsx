import { useState } from 'react';
import { Alert, Button, Input, Skeleton, Tag, Typography } from 'antd';
import { fmtDate } from './format';
import { downloadMemoPdf } from './loanDetailService';
import type { AiBlock, MemoSections } from './types';
import { useMemoAutosave } from './useMemoAutosave';
import styles from './loan-detail.module.css';

const NOS = ['1', '2', '3', '4', '5', '6', '7'];
const time = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });

function ReadSections({ titles, sections }: { titles: Record<string, string>; sections: MemoSections }) {
  return (
    <>
      {NOS.map((n) => {
        const s = sections[n];
        return (
          <div key={n} className={styles.section} data-testid={`memo-read-${n}`}>
            <b>{n}. {titles[n]}</b>
            <div className={styles.readText}>{s?.body?.trim() || <span className={styles.note}>(để trống)</span>}</div>
            {(s?.ai_blocks ?? []).map((b) => (
              <div key={b.id} className={`${styles.aiBlock} ${styles.aiBlockDone}`}>
                <span className={styles.readText}>{b.text}</span>
                <span className={styles.note}>Nội dung AI đề xuất, đã được người xác nhận</span>
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}

function AiBlockView({ b, canDecide, onDecide }: { b: AiBlock; canDecide: boolean; onDecide: (d: 'CONFIRM' | 'REJECT') => void }) {
  if (b.state === 'REJECTED') return null;
  const pending = b.state === 'PENDING';
  return (
    <div className={`${styles.aiBlock} ${pending ? '' : styles.aiBlockDone}`} data-testid={`ai-block-${b.state}`}>
      <Tag color={pending ? 'warning' : 'success'}>{pending ? 'AI đề xuất – chờ xác nhận (chưa vào bản trình)' : 'AI đề xuất – đã xác nhận'}</Tag>
      <span className={styles.readText}>{b.text}</span>
      {b.source_ref && <span className={styles.note}>Nguồn: {b.source_ref}</span>}
      {pending && canDecide && (
        <div>
          <Button size="small" type="primary" onClick={() => onDecide('CONFIRM')}>Xác nhận</Button>{' '}
          <Button size="small" onClick={() => onDecide('REJECT')}>Bỏ đề xuất</Button>
        </div>
      )}
    </div>
  );
}

function PdfButton({ loanId, revision }: { loanId: string; revision: number | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = revision == null;
  const click = async () => {
    setBusy(true); setError(null);
    try { await downloadMemoPdf(loanId); } catch { setError('Không tải được PDF, thử lại sau.'); } finally { setBusy(false); }
  };
  return (
    <div>
      <Button data-testid="memo-pdf" disabled={locked} loading={busy} onClick={() => void click()}>
        {locked ? 'Tải PDF' : 'Tải PDF bản chốt mới nhất'}
      </Button>
      {locked && <span className={styles.note} data-testid="memo-pdf-reason"> Chưa xuất được: Tờ trình chưa được chốt khi trình.</span>}
      {error && <span role="alert" className={styles.note}> {error}</span>}
    </div>
  );
}

export function MemoPanel({ loanId }: { loanId: string }) {
  const m = useMemoAutosave(loanId);
  if (m.loadError) return <Alert type="error" showIcon message={m.loadError} />;
  if (!m.view) return <Skeleton active />;
  const { view } = m;
  const done = view.progress ? Object.values(view.progress).filter(Boolean).length : null;
  const editing = view.editable && view.draft;

  return (
    <section id="to-trinh" className={styles.panel} aria-label="Tờ trình thẩm định">
      <h2>Tờ trình thẩm định</h2>
      <PdfButton loanId={loanId} revision={view.finalized?.revision ?? null} />
      {editing && view.draft ? (
        <>
          <Typography.Text type="secondary" role="status" data-testid="memo-save-status">
            {m.state.kind === 'saving' ? 'Đang lưu…' : m.state.kind === 'saved' ? `Đã tự lưu lúc ${time(m.state.at)}` : m.state.kind === 'error' ? `Chưa lưu được: ${m.state.message}` : m.state.kind === 'conflict' ? 'Chưa lưu: Tờ trình đã đổi ở nơi khác' : 'Chưa có thay đổi'}
            {done != null ? ` · ${done}/7 mục đã điền` : ''}
          </Typography.Text>
          {m.state.kind === 'conflict' && (
            <Alert type="error" showIcon role="alert" message="Tờ trình vừa được lưu ở tab hoặc phiên khác"
              description="Thay đổi của bạn chưa được ghi để tránh đè mất bản kia. Tải bản mới nhất rồi sửa tiếp."
              action={<Button onClick={() => void m.reload()}>Tải bản mới nhất</Button>} />
          )}
          {NOS.map((n) => (
            <div key={n} className={styles.section}>
              <label htmlFor={`memo-${n}`}><b>{n}. {view.titles[n]}</b> {view.progress?.[n] ? <Tag color="success">Đã điền</Tag> : <Tag>Chưa điền</Tag>}</label>
              <Input.TextArea id={`memo-${n}`} autoSize={{ minRows: 2, maxRows: 10 }} value={m.bodies[n] ?? ''}
                onChange={(e) => m.change(n, e.target.value)} onBlur={() => void m.saveNow()} />
              {(view.draft?.sections[n]?.ai_blocks ?? []).map((b) => (
                <AiBlockView key={b.id} b={b} canDecide={n !== '7'} onDecide={(d) => void m.decide(b.id, d)} />
              ))}
            </div>
          ))}
        </>
      ) : view.finalized ? (
        <>
          <Alert type="info" showIcon
            message={"Bản đã chốt lúc trình"}
            description={`${view.finalized.finalized_by_name} chốt ngày ${fmtDate(view.finalized.finalized_at)}. Nội dung không sửa được; chỉ gồm phần người viết và phần AI đã được xác nhận.`} />
          <ReadSections titles={view.titles} sections={view.finalized.sections} />
        </>
      ) : (
        <span className={styles.note}>Tờ trình chưa được trình.</span>
      )}
    </section>
  );
}
