/**
 * Sổ Tín Dụng — token (bản TypeScript cho Ant Design và SVG).
 * ------------------------------------------------------------------
 * Nguồn duy nhất là `src/styles/tokens.css` (bản sao của
 * `docs/design/mockups-v2/tokens.css`). Ant Design cần giá trị cụ thể nên các hằng
 * dưới đây lặp lại giá trị đó; `theme.test.ts` so khớp từng giá trị với tokens.css,
 * nên lệch là test đỏ. Component phải đọc màu qua CSS variable hoặc theme token,
 * không hard-code mã màu.
 */

export const colors = {
  paper: '#F3F5F6',
  paper2: '#E5EAEC',
  surface: '#FFFFFF',
  surface2: '#F7F9FA',
  rule: '#DAE1E4',
  ruleStrong: '#B1BDC2',
  control: '#66757B',
  ink: '#172229',
  ink2: '#3D4A52',
  ink3: '#57646B',
  inkInv: '#F3F5F6',
  brand900: '#0A3640',
  brand700: '#0E4D5A',
  brand500: '#1A6E7E',
  brand100: '#D2E7EB',
  brand50: '#EAF4F6',
  amber800: '#6A4708',
  amber700: '#8C5E0E',
  amber500: '#D29A2E',
  amber100: '#F8EBCF',
  ai700: '#3B4A53',
  ai500: '#73838C',
  ai100: '#E2E8EB',
  ai50: '#F4F6F7',
  ok700: '#1B6A3F',
  ok100: '#DDEFE4',
  warn700: '#8F5400',
  warn100: '#F8E8C8',
  danger700: '#A8281D',
  danger100: '#F7DDD9',
  info700: '#1D4F91',
  info100: '#DCE7F6',
  neutral100: '#E3E8EA',
} as const;

/** Tên biến CSS tương ứng từng màu (dùng cho test đối chiếu và tài liệu). */
export const colorVars: Record<keyof typeof colors, string> = {
  paper: '--paper',
  paper2: '--paper-2',
  surface: '--surface',
  surface2: '--surface-2',
  rule: '--rule',
  ruleStrong: '--rule-strong',
  control: '--control',
  ink: '--ink',
  ink2: '--ink-2',
  ink3: '--ink-3',
  inkInv: '--ink-inv',
  brand900: '--brand-900',
  brand700: '--brand-700',
  brand500: '--brand-500',
  brand100: '--brand-100',
  brand50: '--brand-50',
  amber800: '--amber-800',
  amber700: '--amber-700',
  amber500: '--amber-500',
  amber100: '--amber-100',
  ai700: '--ai-700',
  ai500: '--ai-500',
  ai100: '--ai-100',
  ai50: '--ai-50',
  ok700: '--ok-700',
  ok100: '--ok-100',
  warn700: '--warn-700',
  warn100: '--warn-100',
  danger700: '--danger-700',
  danger100: '--danger-100',
  info700: '--info-700',
  info100: '--info-100',
  neutral100: '--neutral-100',
};

export const fonts = {
  display: "'Be Vietnam Pro', system-ui, 'Segoe UI', sans-serif",
  body: "'Be Vietnam Pro', system-ui, 'Segoe UI', sans-serif",
  num: "'Be Vietnam Pro', system-ui, 'Segoe UI', sans-serif",
} as const;

export const radius = { sm: 3, md: 6, lg: 10, pill: 999 } as const;

export const shadow = {
  s1: '0 1px 0 rgba(27,36,48,.06)',
  s2: '0 4px 14px rgba(27,36,48,.10)',
  s3: '0 12px 32px rgba(14,31,61,.18)',
} as const;

export const layout = { sidebarWidth: 216, topbarHeight: 52, demoHeight: 34 } as const;

/**
 * Tên cũ (`shbColors`) còn được vài trang chưa làm lại import. Giữ đúng hình dạng
 * nhưng trỏ về màu mới; sẽ bỏ khi các trang đó được làm lại.
 */
export const shbColors = {
  orange: { 50: colors.amber100, 100: colors.amber100, 200: colors.amber100, 300: colors.amber500, 400: colors.amber500, 500: colors.amber500, 600: colors.amber700, 700: colors.amber700, 800: colors.amber800, 900: colors.amber800 },
  brand: { 50: colors.brand50, 100: colors.brand100, 200: colors.brand100, 300: colors.brand500, 400: colors.brand500, 500: colors.brand500, 600: colors.brand500, 700: colors.brand700, 800: colors.brand900, 900: colors.brand900 },
  neutral: {
    white: '#FFFFFF',
    warmWhite: colors.surface,
    canvas: colors.paper,
    surface: colors.surface,
    surfaceSoft: colors.surface2,
    border: colors.rule,
    borderStrong: colors.ruleStrong,
    textPrimary: colors.ink,
    textSecondary: colors.ink2,
    textMuted: colors.ink3,
  },
  semantic: {
    success: colors.ok700,
    successBg: colors.ok100,
    warning: colors.warn700,
    warningBg: colors.warn100,
    error: colors.danger700,
    errorBg: colors.danger100,
    info: colors.info700,
    infoBg: colors.info100,
  },
} as const;

export const shbRadius = { small: 6, medium: 6, large: 10, card: 10, composer: 10, pill: 999 } as const;
export const shbShadow = { small: shadow.s1, medium: shadow.s2, large: shadow.s3, orangeGlow: '0 0 0 3px rgba(42,74,128,.18)' } as const;
export const shbTypography = {
  fontFamily: fonts.body,
  fontFamilyCode: fonts.num,
  size: { caption: 12, small: 13, supporting: 14, body: 14, bodyLarge: 16, sectionHeading: 20, heroMobile: 26, heroDesktop: 34 },
  lineHeight: { heading: 1.3, body: 1.5, caption: 1.5 },
} as const;
export const shbLayout = { sidebarWidth: 216, sidebarCollapsedWidth: 216, headerHeight: 52, contentMaxWidth: 820, chatMaxWidth: 880, mobileBreakpoint: 768, tabletBreakpoint: 1100 } as const;
export const shbMotion = { micro: 0.12, message: 0.2, panel: 0.2, page: 0.2, ease: [0.2, 0.7, 0.2, 1] as const } as const;

export type ShbColors = typeof shbColors;
