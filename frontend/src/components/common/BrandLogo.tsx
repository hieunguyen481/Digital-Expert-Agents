import styles from './BrandLogo.module.css';

export interface BrandLogoProps {
  /** `white`: chữ sáng, dùng trên nền brand. */
  variant?: 'default' | 'white';
  size?: 'small' | 'medium' | 'large';
  /** Hiện tên "Sổ Tín Dụng" và mô tả bên cạnh logo vuông. */
  showProductName?: boolean;
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<BrandLogoProps['size']>, string> = {
  small: styles.sizeSmall,
  medium: styles.sizeMedium,
  large: styles.sizeLarge,
};

/**
 * Logo "Sổ Tín Dụng": ô vuông giấy, chữ S brand, gạch chân đồng (§5.7).
 */
export function BrandLogo({ variant = 'default', size = 'medium', showProductName = false, className }: BrandLogoProps) {
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
