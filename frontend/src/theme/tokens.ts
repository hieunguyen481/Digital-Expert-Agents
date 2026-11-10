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
  paper: '#F1F2EE',
  paper2: '#E4E7E0',
  surface: '#FBFBF8',
  surface2: '#F5F6F2',
  rule: '#D3D7CC',
  ruleStrong: '#AEB3A1',
  control: '#6F7660',
  ink: '#1B2430',
  ink2: '#434C5A',
  ink3: '#5E6573',
  inkInv: '#F1F2EE',
  navy900: '#0E1F3D',
  navy700: '#14284B',
  navy500: '#2A4A80',
  navy100: '#DCE4F1',
  navy50: '#EDF1F8',
  bronze800: '#5A4210',
  bronze700: '#7A5C22',
  bronze500: '#B08A3E',
  bronze100: '#F0E6CF',
  ai700: '#4F3590',
  ai500: '#6B4FB8',
  ai100: '#E9E3F6',
  ai50: '#F3F0FA',
  ok700: '#1B6A3F',
  ok100: '#DDEFE4',
  warn700: '#8F5400',
  warn100: '#F8E8C8',
  danger700: '#A8281D',
  danger100: '#F7DDD9',
  info700: '#1D4F91',
  info100: '#DCE7F6',
  neutral100: '#E2E5DC',
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
  navy900: '--navy-900',
  navy700: '--navy-700',
  navy500: '--navy-500',
  navy100: '--navy-100',
  navy50: '--navy-50',
  bronze800: '--bronze-800',
  bronze700: '--bronze-700',
  bronze500: '--bronze-500',
  bronze100: '--bronze-100',
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
  display: "'Newsreader', 'Times New Roman', serif",
  body: "'Be Vietnam Pro', system-ui, 'Segoe UI', sans-serif",
  num: "'IBM Plex Mono', ui-monospace, Consolas, monospace",
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
  orange: { 50: colors.bronze100, 100: colors.bronze100, 200: '#DCCB9F', 300: colors.bronze500, 400: colors.bronze500, 500: colors.bronze500, 600: colors.bronze700, 700: colors.bronze700, 800: colors.bronze800, 900: colors.bronze800 },
  navy: { 50: colors.navy50, 100: colors.navy100, 200: colors.navy100, 300: colors.navy500, 400: colors.navy500, 500: colors.navy500, 600: colors.navy500, 700: colors.navy700, 800: colors.navy900, 900: colors.navy900 },
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
