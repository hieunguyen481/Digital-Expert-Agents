import { ThunderboltOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAiPanel } from '@/features/ai-panel/AiPanelContext';
import { formatBillion, slaText, stepLabel } from './format';
import styles from './my-work.module.css';
import type { WorkItem } from './types';

/** Việc suy từ dữ liệu thật của hồ sơ, tối đa 4. */
export function heroTasks(item: WorkItem): string[] {
  const tasks: string[] = [];
  if (item.fields_to_confirm > 0) tasks.push(`Xác nhận ${item.fields_to_confirm} số liệu`);
  if (item.open_flags > 0) {
    tasks.push(
      item.high_flags > 0
        ? `Xử lý ${item.open_flags} cờ cảnh báo, trong đó ${item.high_flags} cờ Cao`
        : `Xử lý ${item.open_flags} cờ cảnh báo`,
    );
  }
  if (item.step_code === 'RM_REWORK') tasks.push('Hồ sơ bị trả lại: đọc lý do trong nhật ký hồ sơ rồi sửa đề xuất');
  else tasks.push(`Việc ở bước ${stepLabel(item.step_code)}`);
  return tasks.slice(0, 4);
}

export function Hero({ item }: { item: WorkItem }) {
  const { openWith } = useAiPanel();
  const navigate = useNavigate();
  const rework = item.step_code === 'RM_REWORK';
  return (
    <section className={styles.hero} aria-label="Việc khẩn nhất">
      <div className={styles.heroMain}>
        <h2 className={styles.heroTitle}>{item.customer_name}</h2>
        <p className={styles.heroMeta}>
          {item.application_number} · <b>{formatBillion(item.requested_amount)}</b> · {stepLabel(item.step_code)} ·{' '}
          <span className={styles.sla}>{slaText(item, new Date())}</span>
        </p>
        <ul className={styles.heroTasks}>
          {heroTasks(item).map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
      <Button type="primary" data-testid="hero-open" onClick={() => navigate(rework ? `/de-xuat-vay/${item.loan_application_id}` : `/ho-so-vay/${item.loan_application_id}`)}>
        {rework ? 'Sửa đề xuất ›' : 'Mở hồ sơ ›'}
      </Button>
      <Button
        icon={<ThunderboltOutlined />}
        onClick={() =>
          openWith({ type: 'case', id: item.loan_application_id, label: `${item.application_number} · ${item.customer_name}` })
        }
      >
        Hỏi AI
      </Button>
    </section>
  );
}
