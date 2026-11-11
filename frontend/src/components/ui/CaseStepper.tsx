import { CheckOutlined } from '@ant-design/icons';
import { Fragment } from 'react';
import styles from './ui.module.css';

export const CASE_STEPS = ['Soạn đề xuất', 'Kiểm tra', 'Thẩm định', 'Rủi ro', 'Phê duyệt', 'Hoàn tất'] as const;

/** Bước hồ sơ: đã xong (navy, dấu tick), đang ở (đồng), bị trả lại (vàng). `current` tính từ 0. */
export function CaseStepper({ current, returned = false, steps = CASE_STEPS, backAt, notes }: {
  current: number; returned?: boolean; steps?: readonly string[];
  /** Hồ sơ bị trả về từ chặng này: chặng trước đó vẫn là đã xong, chặng này có dấu ↺, `current` là chặng đang sửa. */
  backAt?: number;
  /** Chú thích ngắn nối sau tên chặng, ví dụ "(đang sửa)". */
  notes?: Record<number, string>;
}) {
  return (
    <ol className={styles.stepper} aria-label="Các bước của hồ sơ">
      {steps.map((label, i) => {
        const back = backAt !== undefined && backAt > current && i === backAt;
        const done = backAt !== undefined && backAt > current ? i !== current && i < backAt && i > current : i < current;
        const cur = i === current;
        const cls = back ? styles.stBack : done ? styles.stDone : cur ? (returned && backAt === undefined ? styles.stBack : styles.stCur) : '';
        return (
          <Fragment key={label}>
            {i > 0 && <li aria-hidden className={`${styles.ln} ${i <= Math.max(current, backAt !== undefined && backAt > current ? backAt - 1 : current) ? styles.lnDone : ''}`} />}
            <li className={`${styles.st} ${cls}`} aria-current={cur ? 'step' : undefined}>
              <b>{done ? <CheckOutlined aria-label="Đã xong" /> : back ? <span aria-label="Bị trả về">↺</span> : i + 1}</b>
              {label}{notes?.[i] ? ` ${notes[i]}` : ''}
              {cur && returned && backAt === undefined && <span className="sr-only"> (bị trả lại)</span>}
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
