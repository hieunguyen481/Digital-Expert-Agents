import { shbColors, shbTypography } from './tokens';

/**
 * Palette cho Ant Design Charts: navy làm chuỗi chính, đồng làm điểm nhấn (cột
 * cuối, chuỗi nổi bật), tím mực chỉ cho số liệu do AI sinh. Không rainbow.
 */
export const shbChartPalette = [
  shbColors.navy[700],
  shbColors.orange[500],
  shbColors.navy[500],
  shbColors.orange[700],
  shbColors.navy[100],
  shbColors.neutral.borderStrong,
];

/**
 * Theme dùng chung cho mọi chart, truyền vào Ant Design Charts qua `BaseChart`.
 * Không chứa dữ liệu domain.
 */
export const shbChartTheme = {
  type: 'light' as const,
  category10: shbChartPalette,
  category20: [...shbChartPalette, ...shbChartPalette],
  view: {
    viewFill: 'transparent',
  },
  token: {
    colorBackground: 'transparent',
    colorStroke: shbColors.neutral.border,
  },
  axis: {
    labelFontFamily: shbTypography.fontFamily,
    labelFontSize: 12,
    labelFill: shbColors.neutral.textSecondary,
    lineStroke: shbColors.neutral.border,
    tickStroke: shbColors.neutral.border,
    gridStroke: shbColors.neutral.border,
    gridStrokeOpacity: 0.6,
    gridLineDash: [3, 4],
  },
  legend: {
    itemLabelFontFamily: shbTypography.fontFamily,
    itemLabelFontSize: 12,
    itemLabelFill: shbColors.neutral.textSecondary,
  },
  label: {
    fontFamily: shbTypography.fontFamily,
    fontSize: 12,
    fill: shbColors.neutral.textPrimary,
  },
  tooltip: {
    fontFamily: shbTypography.fontFamily,
  },
};
