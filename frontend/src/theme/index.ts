import type { ThemeConfig } from 'antd';
import { componentOverrides } from './componentOverrides';
import { colors, fonts, radius } from './tokens';

/**
 * Theme "Sổ Tín Dụng" cho Ant Design ConfigProvider, nạp một lần ở
 * `src/app/AppProviders.tsx`. Giá trị lấy từ `./tokens` (khớp tokens.css).
 */
export const appTheme: ThemeConfig = {
  token: {
    colorPrimary: colors.navy700,
    colorPrimaryHover: colors.navy900,
    colorPrimaryActive: colors.navy900,
    colorPrimaryBg: colors.navy50,
    colorPrimaryBgHover: colors.navy100,
    colorPrimaryBorder: colors.navy500, // vòng focus của Antd: ≥3:1 trên nền giấy

    colorLink: colors.navy500,
    colorLinkHover: colors.navy900,
    colorLinkActive: colors.navy900,

    colorText: colors.ink,
    colorTextSecondary: colors.ink2,
    colorTextTertiary: colors.ink3,
    colorTextQuaternary: colors.ink3,
    colorTextPlaceholder: colors.ink3,
    colorTextDescription: colors.ink3,
    colorTextHeading: colors.ink,
    colorTextDisabled: colors.ink3,

    colorBgLayout: colors.paper,
    colorBgContainer: colors.surface,
    colorBgElevated: colors.surface,
    colorBgSpotlight: colors.navy900,
    colorBgContainerDisabled: colors.paper2,
    colorFillSecondary: colors.paper2,
    colorFillTertiary: colors.surface2,

    colorBorder: colors.control,
    colorBorderSecondary: colors.rule,
    colorSplit: colors.rule,

    colorSuccess: colors.ok700,
    colorSuccessBg: colors.ok100,
    colorWarning: colors.warn700,
    colorWarningBg: colors.warn100,
    colorError: colors.danger700,
    colorErrorBg: colors.danger100,
    colorInfo: colors.info700,
    colorInfoBg: colors.info100,

    borderRadius: radius.md,
    borderRadiusLG: radius.lg,
    borderRadiusSM: radius.sm,
    borderRadiusXS: radius.sm,

    fontFamily: fonts.body,
    fontFamilyCode: fonts.num,
    fontSize: 14,
    fontSizeSM: 12,
    fontSizeLG: 16,
    fontSizeHeading1: 34,
    fontSizeHeading2: 26,
    fontSizeHeading3: 20,
    fontSizeHeading4: 16,
    fontSizeHeading5: 14,
    lineHeight: 1.5,

    controlHeight: 36,
    controlHeightLG: 44,
    controlHeightSM: 30,

    motionDurationFast: '0.12s',
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.2s',
    motionEaseOut: 'cubic-bezier(.2,.7,.2,1)',

    lineWidthFocus: 2,
    controlOutline: 'rgba(42, 74, 128, 0.6)',
    controlOutlineWidth: 2,

    wireframe: false,
  },
  components: componentOverrides,
};

export { colors, fonts, radius, shadow, layout, colorVars } from './tokens';
export { shbChartTheme, shbChartPalette } from './chartTheme';
