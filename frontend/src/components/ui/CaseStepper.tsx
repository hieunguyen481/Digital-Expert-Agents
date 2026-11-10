import { CheckOutlined } from '@ant-design/icons';
import { Fragment } from 'react';
import styles from './ui.module.css';

export const CASE_STEPS = ['Soạn đề xuất', 'Kiểm tra', 'Thẩm định', 'Rủi ro', 'Phê duyệt', 'Hoàn tất'] as const;

/** Bước hồ sơ: đã xong (navy, dấu tick), đang ở (đồng), bị trả lại (vàng). `current` tính từ 0. */
export function CaseStepper({ current, returned = false, steps = CASE_STEPS }: { current: number; returned?: boolean; steps?: readonly string[] }) {
  return (
    <ol className={styles.stepper} aria-label="Các bước của hồ sơ">
      {steps.map((label, i) => {
        const done = i < current;
        const cur = i === current;
        const cls = done ? styles.stDone : cur ? (returned ? styles.stBack : styles.stCur) : '';
        return (
          <Fragment key={label}>
            {i > 0 && <li aria-hidden className={`${styles.ln} ${i <= current ? styles.lnDone : ''}`} />}
            <li className={`${styles.st} ${cls}`} aria-current={cur ? 'step' : undefined}>
              <b>{done ? <CheckOutlined aria-label="Đã xong" /> : i + 1}</b>
              {label}
              {cur && returned && <span className="sr-only"> (bị trả lại)</span>}
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
