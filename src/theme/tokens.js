/**
 * Design tokens as plain JS literals, for consumers that can't read CSS custom
 * properties (ECharts `option` objects). Keep in sync with the CSS source of truth:
 * `--mainsec` in src/index.css.
 */

export const BRAND_COLOR = '#EC7D09'; // must match --mainsec in src/index.css

// Curated font-family options for Theme/Dashboard Style `select` fields (dashboard title,
// widget title, axis text) — plain CSS font stacks, no @font-face loading, so every option
// here is guaranteed available without adding a new dependency or network request.
export const FONT_FAMILY_OPTIONS = [
  { value: '', label: 'Default' },
  { value: "'Inter', system-ui, sans-serif", label: 'Inter' },
  { value: 'Arial, Helvetica, sans-serif', label: 'Arial' },
  { value: "'Trebuchet MS', sans-serif", label: 'Trebuchet MS' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: "'Times New Roman', serif", label: 'Times New Roman' },
  { value: "'Courier New', monospace", label: 'Courier New' },
];

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

// Multi-series color palette (for charts with more than one accent — pie/donut slices,
// eventually radar/stacked-bar series) — same hues already used for widgetTypeRegistry.js's
// per-type `iconColor`s, kept as one shared list so the two stay visually consistent.
export const CHART_PALETTE = ['#378ADD', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#0EA5E9', '#EC4899', '#EC7D09'];

// Curated named palette presets (Superset-style "Color scheme" picker — a curated list of
// categorical palettes, not a custom color editor) — offered in ThemeManager.jsx alongside
// the existing custom 8-swatch editor as a quick-fill starting point, not a replacement for
// it. "DataPlus Default" is exactly today's CHART_PALETTE, so picking it changes nothing for
// existing themes already using the implicit default.
export const PALETTE_PRESETS = [
  { name: 'DataPlus Default', colors: CHART_PALETTE },
  { name: 'Vivid', colors: ['#E63946', '#F4A261', '#2A9D8F', '#264653', '#E9C46A', '#8338EC', '#3A86FF', '#FB5607'] },
  { name: 'Muted', colors: ['#6B8CAE', '#8FAE6B', '#AE8F6B', '#8B6BAE', '#AE6B8F', '#6BAEA6', '#AEA36B', '#6B72AE'] },
  { name: 'Monochrome Blue', colors: ['#0B3C5D', '#1D5B8A', '#2E7BB6', '#4F9BD1', '#7FBCE3', '#A8D3ED', '#0E2A43', '#3E7CA6'] },
];

// Darkens a hex color toward black by `amount` (0..1). Used to derive a StatCard's
// "shaded" dark-mode gradient straight from its own accent color (see
// widgetTypeRegistry.js's `shade` styleField) — the same idea as the real KPI
// dashboard's per-card `darkGradient` presets, but computed instead of hand-picked.
export function darkenHex(hex, amount) {
  const full = hex.replace('#', '').padStart(6, '0');
  const num = parseInt(full, 16);
  const r = Math.round(((num >> 16) & 255) * (1 - amount));
  const g = Math.round(((num >> 8) & 255) * (1 - amount));
  const b = Math.round((num & 255) * (1 - amount));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
