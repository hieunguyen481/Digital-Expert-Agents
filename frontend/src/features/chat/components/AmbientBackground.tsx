import styles from './AmbientBackground.module.css';

/** Nền màn hình chào: giấy sổ cái kẻ ngang rất nhạt. Không chặn click, không chuyển động. */
export function AmbientBackground() {
  return <div className={styles.background} aria-hidden="true" />;
}
