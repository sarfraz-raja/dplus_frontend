/**
 * Design tokens as plain JS literals, for consumers that can't read CSS custom
 * properties (ECharts `option` objects). Keep in sync with the CSS source of truth:
 * `--mainsec` in src/index.css.
 */

export const BRAND_COLOR = '#EC7D09'; // must match --mainsec in src/index.css

export const CHART_TEXT_COLORS = {
  dark: { text: '#eef1f6', sub: '#8b93a7' },
  light: { text: '#1a1a18', sub: '#5f5e5a' },
};

export const CHART_LINE_COLORS = {
  dark: { axis: 'rgba(255,255,255,0.14)', split: 'rgba(255,255,255,0.06)', track: 'rgba(255,255,255,0.08)' },
  light: { axis: 'rgba(0,0,0,0.14)', split: 'rgba(0,0,0,0.06)', track: 'rgba(0,0,0,0.08)' },
};

export function chartTokens(isDark) {
  const mode = isDark ? 'dark' : 'light';
  return { ...CHART_TEXT_COLORS[mode], ...CHART_LINE_COLORS[mode] };
}

// CSS value for the `rowFontWeight` styleFields key (see widgetTypeRegistry.js) — the
// schema stores an abstract weight key ('normal'|'medium'|'semibold'|'bold'); components
// map it to a real CSS font-weight through this table. `rowFontSize` is a raw px number,
// no lookup table needed.
export const FONT_WEIGHT_CSS = { normal: 400, medium: 500, semibold: 600, bold: 700 };
