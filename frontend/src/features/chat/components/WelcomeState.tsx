import { motion, useReducedMotion } from 'motion/react';
import { quickPromptsFor } from '@/features/chat/constants/quickPrompts';
import { useUiRole } from '@/auth/session';
import styles from './WelcomeState.module.css';

export interface WelcomeStateProps {
  /** Được gọi khi chuyên viên chọn một thẻ gợi ý. */
  onSelectPrompt: (prompt: string) => void;
  /** Tên chuyên viên đang đăng nhập — lời chào cá nhân hoá. */
  staffName?: string;
}

/**
 * Màn hình chào khi hội thoại chưa có tin nhắn.
 * Một câu hỏi mở + các gợi ý dạng chữ (kiểu ChatGPT/Claude), không logo, không thẻ có biểu tượng.
 */
export function WelcomeState({ onSelectPrompt, staffName }: WelcomeStateProps) {
  const prefersReducedMotion = useReducedMotion();
  const prompts = quickPromptsFor(useUiRole());

  const fadeUp = (delay: number) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  // Kiểu ChatGPT/Claude: một câu hỏi mở, các gợi ý là dòng chữ (không biểu tượng, không khung); ô nhập ngay bên dưới.
  return (
    <div className={styles.wrapper}>
      <div className={styles.inner}>
        {staffName && <motion.p className={styles.greet} {...fadeUp(0.02)}>Chào <span>{staffName.trim()}</span></motion.p>}
        <motion.h1 className={styles.heading} {...fadeUp(0.05)}>Hôm nay bạn cần tra cứu gì?</motion.h1>
        <div className={styles.grid}>
          {prompts.map((item, index) => (
            <motion.button
              type="button"
              key={item.id}
              className={styles.suggest}
              onClick={() => onSelectPrompt(item.prompt)}
              {...fadeUp(0.12 + index * 0.04)}
            >
              <span className={styles.suggestTitle}>{item.title}</span>
              <span className={styles.suggestDesc}>{item.description}</span>
            </motion.button>
          ))}
        </div>
        <p className={styles.hint}>Hỏi về một hồ sơ cụ thể: gõ / rồi tên khách hàng.</p>
      </div>
    </div>
  );
}
