import { FONT_WEIGHT_CSS } from '../../theme/tokens';

// Single source of truth for an ECharts axis's `name`/`nameLocation`/`nameGap`/`nameRotate`/
// `nameTextStyle` — every chart widget (Line, Area, Bar, Waterfall, StackedBar, Scatter, ...)
// used to hand-roll this same block, which is exactly how the Y-axis-title fix landed on five
// of them but missed ScatterChart.jsx entirely (see the conversation this was extracted in —
// its y-axis title was still the raw unconditional column name, never wired to the
// vertical/rotated convention the rest already got. Callers resolve a blank
// `mapping.x_axis_title`/`y_axis_title` to the underlying column name before it ever reaches
// here (see renderChartWidget.jsx), so `label` is effectively never empty in practice; the
// falsy-guard below just keeps this helper safe to call standalone.
// Returns `{}` (nothing merged in) when `label` is falsy, so `{...buildAxisTitle(...)}` is
// always safe to spread — no separate `label ? {...} : {}` branch needed at each call site.
export function buildAxisTitle(label, { axisTextSize, axisTextColor, axisTextWeight, axisTextFont, vertical = false, gap } = {}) {
  if (!label) return {};
  return {
    name: label,
    nameLocation: 'middle',
    nameGap: gap ?? (vertical ? 28 : 22),
    ...(vertical ? { nameRotate: 90 } : {}),
    nameTextStyle: {
      fontSize: axisTextSize || 9,
      color: axisTextColor || undefined,
      fontWeight: FONT_WEIGHT_CSS[axisTextWeight],
      fontFamily: axisTextFont || undefined,
    },
  };
}

// A vertical axis title (see buildAxisTitle's `vertical: true`) needs its own reserved grid
// column, not just tick-label room — every chart widget with a Y axis title used to repeat
// this same `label ? biggerMargin : normalMargin` ternary inline; centralized here instead.
export function gridMarginForVerticalTitle(label, base, withLabel) {
  return label ? withLabel : base;
}
