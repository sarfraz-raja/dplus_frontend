import { formatCompactNumber } from '../DashboardBuilder/utils/formatNumber';

// Small ECharts styling helpers shared by the axis charts (Line/Area/Bar) — one place for how a
// Y-axis value reads, how dense the Y axis is, and the "Fade" area fill.

// Y-axis tick label: compact for large values (4.4M, 19.5k, 1.2B), as-is below 1000 (99.8).
// Replaces a thousands-only formatter that showed 4,400,000 as "4400k".
export const formatAxisValue = (v) => (
  typeof v === 'number' && Math.abs(v) >= 1000 ? formatCompactNumber(v, 1).replace('K', 'k') : v
);

// Style → Axis → "Y-axis ticks" (yAxisTicks). 'few' = the 2 split lines these charts always drew.
const Y_AXIS_SPLITS = { few: 2, normal: 4, many: 6 };
export const yAxisSplitNumber = (yAxisTicks) => Y_AXIS_SPLITS[yAxisTicks] || Y_AXIS_SPLITS.few;

// Style → "Grid lines" (showGridLines). Only overrides when hidden, so the registered chart
// theme's own grid styling is untouched otherwise.
export const gridLineOption = (showGridLines) => (showGridLines === 'hide' ? { splitLine: { show: false } } : {});

// Style → "Fill style" (fillStyle) 'fade': the area's color fading to transparent toward the
// bottom, instead of one flat tint. Needs a real hex color to fade; anything else (or 'solid')
// keeps the plain color.
const transparentOf = (c) => {
  if (/^#[0-9a-f]{6}$/i.test(c)) return `${c}00`;
  if (/^#[0-9a-f]{3}$/i.test(c)) return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}00`;
  return null;
};
export const areaFillColor = (color, fillStyle) => {
  const end = fillStyle === 'fade' && typeof color === 'string' ? transparentOf(color) : null;
  if (!end) return color;
  return {
    type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
    colorStops: [{ offset: 0, color }, { offset: 1, color: end }],
  };
};
