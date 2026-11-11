import type { ReactNode } from 'react';

const CODE = /(HSV-\d{4}-\d+)/g;

/** Văn bản có chứa mã hồ sơ `HSV-…`: mã luôn mono (một kiểu mã hồ sơ trong toàn ứng dụng). */
export function CodeText({ children }: { children: string }): ReactNode {
  return children.split(CODE).map((part, i) => (i % 2 === 1
    ? <span key={i} style={{ fontFamily: 'var(--font-num)', fontVariantNumeric: 'tabular-nums', fontSize: '0.93em', fontWeight: 500 }}>{part}</span>
    : part));
}
