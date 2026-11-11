import styles from './SHBLogo.module.css';

export interface SHBLogoProps {
  /** `white`: chữ sáng, dùng trên nền navy. */
  variant?: 'default' | 'white';
  size?: 'small' | 'medium' | 'large';
  /** Hiện tên "Sổ Tín Dụng" và mô tả bên cạnh logo vuông. */
  showProductName?: boolean;
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<SHBLogoProps['size']>, string> = {
  small: styles.sizeSmall,
  medium: styles.sizeMedium,
  large: styles.sizeLarge,
};

/**
 * Logo "Sổ Tín Dụng": ô vuông giấy, chữ S navy, gạch chân đồng (§5.7).
 * Tên tệp và tên component còn là `SHBLogo` vì vài tệp của Chat (đang do crew khác
 * sửa) vẫn import tên này; đổi tên sang `BrandLogo` khi các tệp đó được làm lại.
 */
export function SHBLogo({ variant = 'default', size = 'medium', showProductName = false, className }: SHBLogoProps) {
  const rootClassName = [styles.logo, SIZE_CLASS[size], variant === 'white' ? styles.white : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <span className={rootClassName}>
      <span className={styles.mark} aria-hidden="true">
        <span>S</span>
      </span>
      {showProductName ? (
        <span className={styles.productName}>
          <span className={styles.productTitle}>Sổ Tín Dụng</span>
          <span className={styles.productTagline}>Tín dụng doanh nghiệp</span>
        </span>
      ) : (
        <span className="sr-only">Sổ Tín Dụng</span>
      )}
    </span>
  );
}
